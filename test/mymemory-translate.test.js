const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  isUnusableTranslation,
  parseMyMemoryPayload,
  resetQuotaBackoff,
  setQuotaBackoff,
  isQuotaBackoffActive,
  hashSource,
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
});
