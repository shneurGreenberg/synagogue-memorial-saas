const crypto = require('crypto');
const https = require('https');
const StoredTranslation = require('../models/StoredTranslation');

const DEFAULT_BACKOFF_MS = 60 * 60 * 1000;
const MAX_SOURCE_CHARS = 450;

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
        resolve(parseMyMemoryPayload(body, response.statusCode, text));
      });
    }).on('error', () => {
      resolve({ ok: false, text });
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

async function translateWithCache(text, langPair, options = {}) {
  const source = String(text || '').trim();
  if (!source) {
    return '';
  }

  const httpsGet = options.httpsGet || https.get.bind(https);
  const sourceHash = hashSource(source, langPair);

  const cached = await readCachedTranslation(sourceHash, langPair);
  if (cached) {
    return cached;
  }

  if (isQuotaBackoffActive()) {
    return source;
  }

  const result = await fetchMyMemory(source, langPair, httpsGet);
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
  fetchMyMemory,
  translateWithCache,
  sanitizeLocalizedText,
  setQuotaBackoff,
  getQuotaBackoffUntil,
  resetQuotaBackoff,
  isQuotaBackoffActive,
};
