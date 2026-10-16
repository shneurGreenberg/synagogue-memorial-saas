const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  isUnusableTranslation,
  parseMyMemoryPayload,
  parseGoogleTranslatePayload,
  resetQuotaBackoff,
  setQuotaBackoff,
  isQuotaBackoffActive,
  hashSource,
  translateWithCache,
} = require('../lib/mymemory-translate');

describe('mymemory translation guards', () => {
  beforeEach(() => {
    resetQuotaBackoff();
  });

  it('detects MyMemory quota and warning responses', () => {
    const warning = 'MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY.';
    assert.equal(isUnusableTranslation(warning), true);
    assert.equal(isUnusableTranslation('QUOTA EXCEEDED'), true);
    assert.equal(isUnusableTranslation('INVALID API KEY'), true);
    assert.equal(isUnusableTranslation('HTTP 503'), true);
    assert.equal(isUnusableTranslation('Нормальный перевод'), false);
  });

  it('falls back to original text on bad API payload', () => {
    const original = 'Genesis 1:1';
    const warningBody = JSON.stringify({
      responseStatus: 200,
      responseData: {
        translatedText: 'MYMEMORY WARNING: QUOTA',
      },
    });

    const parsed = parseMyMemoryPayload(warningBody, 200, original);
    assert.equal(parsed.ok, false);
    assert.equal(parsed.text, original);
    assert.equal(isQuotaBackoffActive(), true);
  });

  it('rejects non-200 responseStatus in JSON', () => {
    const original = 'Tehillim 23';
    const body = JSON.stringify({
      responseStatus: 429,
      responseData: { translatedText: 'ignored' },
    });
    const parsed = parseMyMemoryPayload(body, 200, original);
    assert.equal(parsed.ok, false);
    assert.equal(parsed.text, original);
  });

  it('accepts valid translations', () => {
    const original = 'Genesis 1:1';
    const body = JSON.stringify({
      responseStatus: 200,
      responseData: { translatedText: 'Бытие 1:1' },
    });
    const parsed = parseMyMemoryPayload(body, 200, original);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.text, 'Бытие 1:1');
  });

  it('uses stable hashes per source and lang pair', () => {
    const a = hashSource('same', 'en|ru');
    const b = hashSource('same', 'en|ru');
    const c = hashSource('same', 'en|he');
    assert.equal(a, b);
    assert.notEqual(a, c);
  });

  it('honors quota backoff flag', () => {
    setQuotaBackoff(Date.now() + 60_000);
    assert.equal(isQuotaBackoffActive(), true);
    resetQuotaBackoff();
    assert.equal(isQuotaBackoffActive(), false);
  });

  it('translateWithCache returns stored translation without calling API', async () => {
    const StoredTranslation = require('../models/StoredTranslation');
    const originalFind = StoredTranslation.findOne;
    const originalUpdate = StoredTranslation.findOneAndUpdate;
    StoredTranslation.findOne = () => ({
      lean: async () => ({ translatedText: 'שמור' }),
    });
    StoredTranslation.findOneAndUpdate = async () => {};

    let fetchCalled = false;
    const text = await translateWithCache('Genesis', 'en|he', {
      httpsGet: () => { fetchCalled = true; },
    });
    assert.equal(text, 'שמור');
    assert.equal(fetchCalled, false);

    StoredTranslation.findOne = originalFind;
    StoredTranslation.findOneAndUpdate = originalUpdate;
  });

  it('parses Google Translate unofficial API payloads', () => {
    const original = 'Genesis 1:1';
    const body = JSON.stringify([[['Бытие 1:1', original, null, null, 3]]]);
    const parsed = parseGoogleTranslatePayload(body, original);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.text, 'Бытие 1:1');
    assert.equal(parseGoogleTranslatePayload('not json', original).ok, false);
  });

  it('falls back to Google when MyMemory fails and caches the result', async () => {
    const StoredTranslation = require('../models/StoredTranslation');
    const originalFind = StoredTranslation.findOne;
    const originalUpdate = StoredTranslation.findOneAndUpdate;
    const writes = [];
    StoredTranslation.findOne = () => ({
      lean: async () => null,
    });
    StoredTranslation.findOneAndUpdate = async (query, update) => {
      writes.push(update);
    };

    let callIndex = 0;
    const httpsGet = (url, _opts, callback) => {
      callIndex += 1;
      const isGoogle = String(url).includes('translate.googleapis.com');
      const body = isGoogle
        ? JSON.stringify([[['Перевод', 'Daily study', null, null, 3]]])
        : JSON.stringify({
          responseStatus: 200,
          responseData: { translatedText: 'MYMEMORY WARNING: QUOTA' },
        });
      callback({ statusCode: 200, on: (event, handler) => {
        if (event === 'data') {
          handler(body);
        }
        if (event === 'end') {
          handler();
        }
      } });
      return { on: () => {}, setTimeout: () => {} };
    };

    const text = await translateWithCache('Daily study', 'en|ru', { httpsGet });
    assert.equal(text, 'Перевод');
    assert.equal(callIndex, 2);
    assert.equal(writes.length, 1);
    assert.equal(writes[0].translatedText, 'Перевод');

    StoredTranslation.findOne = originalFind;
    StoredTranslation.findOneAndUpdate = originalUpdate;
  });

  it('uses Google during MyMemory quota backoff', async () => {
    const StoredTranslation = require('../models/StoredTranslation');
    const originalFind = StoredTranslation.findOne;
    const originalUpdate = StoredTranslation.findOneAndUpdate;
    StoredTranslation.findOne = () => ({
      lean: async () => null,
    });
    StoredTranslation.findOneAndUpdate = async () => {};
    setQuotaBackoff(Date.now() + 60_000);

    let myMemoryCalled = false;
    const httpsGet = (url, _opts, callback) => {
      if (String(url).includes('mymemory.translated.net')) {
        myMemoryCalled = true;
      }
      const body = JSON.stringify([[['שלום', 'Hello', null, null, 3]]]);
      callback({ statusCode: 200, on: (event, handler) => {
        if (event === 'data') {
          handler(body);
        }
        if (event === 'end') {
          handler();
        }
      } });
      return { on: () => {}, setTimeout: () => {} };
    };

    const text = await translateWithCache('Hello', 'en|he', { httpsGet });
    assert.equal(text, 'שלום');
    assert.equal(myMemoryCalled, false);

    StoredTranslation.findOne = originalFind;
    StoredTranslation.findOneAndUpdate = originalUpdate;
  });
});
