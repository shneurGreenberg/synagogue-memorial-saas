const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const mongoose = require('mongoose');
const t = require('../lib/mymemory-translate');

test('1.29.2: echo from MyMemory falls back to Google when validate rejects it', async () => {
  const StoredTranslation = mongoose.models.StoredTranslation;
  if (StoredTranslation) {
    StoredTranslation.findOne = () => ({ lean: async () => null });
    StoredTranslation.findOneAndUpdate = async () => null;
  }
  t.resetQuotaBackoff && t.resetQuotaBackoff();
  const calls = [];
  const httpsGet = (url, opts, cb) => {
    calls.push(url);
    const res = new EventEmitter(); res.statusCode = 200; res.resume = () => {};
    const body = url.includes('mymemory')
      ? JSON.stringify({ responseStatus: 200, responseData: { translatedText: 'Time must be guarded.' } })
      : JSON.stringify([[['יש לשמור על הזמן.']]]);
    setImmediate(() => { cb(res); res.emit('data', body); res.emit('end'); });
    const req = new EventEmitter(); req.setTimeout = () => {}; req.destroy = () => {};
    return req;
  };
  const out = await t.translateWithCache('Time must be guarded. x' + Date.now(), 'en|he', {
    httpsGet, validate: (v) => /[\u0590-\u05FF]/.test(v),
  });
  assert.match(out, /[\u0590-\u05FF]/);
  assert.ok(calls.some((u) => u.includes('translate.googleapis.com')));
});
