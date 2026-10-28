const crypto = require('crypto');
const https = require('https');
const StoredTranslation = require('../models/StoredTranslation');

const DEFAULT_BACKOFF_MS = 60 * 60 * 1000;
const MAX_SOURCE_CHARS = 450;
const DEFAULT_GOOGLE_TIMEOUT_MS = 12_000;

let quotaBackoffUntil = 0;

function hashSource(text, langPair) {
  return crypto
    .createHash('sha256')
    .update(`${langPair}\0${String(text || '')}`)
    .digest('hex');
}

function isUnusableTranslation(text) {
  const value = String(text || '').trim();
  if (!value) {
    return true;
  }

  const upper = value.toUpperCase();
  if (upper.includes('MYMEMORY WARNING')) {
    return true;
  }
  if (upper.includes('QUOTA')) {
    return true;
  }
  if (upper.includes('INVALID')) {
    return true;
  }
  if (/^HTTP\s+\d{3}/i.test(value)) {
    return true;
  }
  if (/^ERROR\b/i.test(value)) {
    return true;
  }

  return false;
}

function noteQuotaFromText(text) {
  const upper = String(text || '').toUpperCase();
  if (!upper.includes('MYMEMORY WARNING') && !upper.includes('QUOTA')) {
    return;
  }
  quotaBackoffUntil = Date.now() + DEFAULT_BACKOFF_MS;
}

function setQuotaBackoff(untilMs) {
  quotaBackoffUntil = untilMs;
}

function getQuotaBackoffUntil() {
  return quotaBackoffUntil;
}

function resetQuotaBackoff() {
  quotaBackoffUntil = 0;
}

function isQuotaBackoffActive() {
  return Date.now() < quotaBackoffUntil;
}

function parseMyMemoryPayload(body, statusCode, originalText) {
  if (statusCode && statusCode !== 200) {
    if (statusCode === 429) {
      quotaBackoffUntil = Date.now() + DEFAULT_BACKOFF_MS;
    }
    return { ok: false, text: originalText };
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return { ok: false, text: originalText };
  }

  const responseStatus = Number(payload.responseStatus);
  if (responseStatus && responseStatus !== 200) {
    if (responseStatus === 429) {
      quotaBackoffUntil = Date.now() + DEFAULT_BACKOFF_MS;
    }
    return { ok: false, text: originalText };
  }

  const translated = payload.responseData?.translatedText;
  if (!translated || isUnusableTranslation(translated)) {
    noteQuotaFromText(translated);
    return { ok: false, text: originalText };
  }

  return { ok: true, text: translated };
}

function splitLangPair(langPair) {
  const [sourceLang, targetLang] = String(langPair || '').split('|');
  return {
    sourceLang: sourceLang || 'en',
    targetLang: targetLang || 'en',
  };
}

function parseGoogleTranslatePayload(body, originalText) {
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return { ok: false, text: originalText };
  }

  const translated = payload?.[0]?.[0]?.[0];
  if (!translated || isUnusableTranslation(translated)) {
    return { ok: false, text: originalText };
  }

  return { ok: true, text: translated };
}

function fetchGoogleTranslate(text, langPair, httpsGet = https.get.bind(https), timeoutMs = DEFAULT_GOOGLE_TIMEOUT_MS) {
  const { sourceLang, targetLang } = splitLangPair(langPair);
  const encoded = encodeURIComponent(String(text).slice(0, MAX_SOURCE_CHARS));
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sourceLang)}&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encoded}`;

  return new Promise((resolve) => {
    const request = httpsGet(url, {
      headers: { 'User-Agent': 'SynagogueMemorialBoard/1.0' },
    }, (response) => {
      if (response.statusCode && response.statusCode !== 200) {
        response.resume();
        resolve({ ok: false, text, reason: `HTTP ${response.statusCode}` });
        return;
      }

      let body = '';
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        resolve(parseGoogleTranslatePayload(body, text));
      });
    });

    request.on('error', (err) => {
      resolve({ ok: false, text, reason: `${err.code || ''} ${err.message}`.trim() });
    });

    request.setTimeout(timeoutMs, () => {
      request.destroy();
      resolve({ ok: false, text, reason: 'timeout' });
    });
  });
}

function fetchMyMemory(text, langPair, httpsGet = https.get.bind(https)) {
  const encoded = encodeURIComponent(String(text).slice(0, MAX_SOURCE_CHARS));
  const url = `https://api.mymemory.translated.net/get?q=${encoded}&langpair=${langPair}`;

  return new Promise((resolve) => {
    httpsGet(url, {
      headers: { 'User-Agent': 'SynagogueMemorialBoard/1.0' },
    }, (response) => {
      let body = '';
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        const parsed = parseMyMemoryPayload(body, response.statusCode, text);
        if (!parsed.ok) parsed.reason = `HTTP ${response.statusCode}: ${String(body).replace(/\s+/g, ' ').slice(0, 160)}`;
        resolve(parsed);
      });
    }).on('error', (err) => {
      resolve({ ok: false, text, reason: `${err.code || ''} ${err.message}`.trim() });
    });
  });
}

async function readCachedTranslation(sourceHash, langPair) {
  const row = await StoredTranslation.findOne({ sourceHash, langPair }).lean();
  if (!row || !row.translatedText || isUnusableTranslation(row.translatedText)) {
    return null;
  }
  return row.translatedText;
}

async function writeCachedTranslation(sourceHash, langPair, sourceText, translatedText) {
  if (!translatedText || isUnusableTranslation(translatedText)) {
    return;
  }

  await StoredTranslation.findOneAndUpdate(
    { sourceHash, langPair },
    {
      sourceHash,
      langPair,
      sourceText: String(sourceText || '').slice(0, MAX_SOURCE_CHARS),
      translatedText,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function translateWithRemoteFallback(source, langPair, options = {}) {
  const httpsGet = options.httpsGet || https.get.bind(https);
  const googleTimeoutMs = options.googleTimeoutMs || DEFAULT_GOOGLE_TIMEOUT_MS;

  if (!isQuotaBackoffActive()) {
    const myMemory = await fetchMyMemory(source, langPair, httpsGet);
    if (myMemory.ok) {
      return myMemory;
    }
    console.warn(`Translate ${langPair}: MyMemory failed (${myMemory.reason || 'unknown'})`);
  } else {
    console.warn(`Translate ${langPair}: MyMemory skipped (quota backoff)`);
  }

  const google = await fetchGoogleTranslate(source, langPair, httpsGet, googleTimeoutMs);
  if (!google.ok) console.warn(`Translate ${langPair}: Google failed (${google.reason || 'unknown'})`);
  return google;
}

async function translateWithCache(text, langPair, options = {}) {
  const source = String(text || '').trim();
  if (!source) {
    return '';
  }

  const sourceHash = hashSource(source, langPair);

  const validate = typeof options.validate === 'function' ? options.validate : () => true;
  const cached = await readCachedTranslation(sourceHash, langPair);
  if (cached && validate(cached)) {
    return cached;
  }

  let result = await translateWithRemoteFallback(source, langPair, options);
  if (result.ok && !validate(result.text)) {
    // 1.29.2: MyMemory sometimes answers 200 with an untranslated echo; try Google directly.
    const httpsGet = options.httpsGet || https.get.bind(https);
    result = await fetchGoogleTranslate(source, langPair, httpsGet, options.googleTimeoutMs || DEFAULT_GOOGLE_TIMEOUT_MS);
    if (result.ok && !validate(result.text)) result = { ok: false, text: source };
  }
  if (result.ok) {
    await writeCachedTranslation(sourceHash, langPair, source, result.text);
    return result.text;
  }

  return source;
}

function sanitizeLocalizedText(text, fallback = '') {
  const value = String(text || '').trim();
  if (!value || isUnusableTranslation(value)) {
    return String(fallback || '').trim();
  }
  return value;
}

module.exports = {
  hashSource,
  isUnusableTranslation,
  parseMyMemoryPayload,
  parseGoogleTranslatePayload,
  fetchMyMemory,
  fetchGoogleTranslate,
  translateWithRemoteFallback,
  translateWithCache,
  sanitizeLocalizedText,
  setQuotaBackoff,
  getQuotaBackoffUntil,
  resetQuotaBackoff,
  isQuotaBackoffActive,
};
