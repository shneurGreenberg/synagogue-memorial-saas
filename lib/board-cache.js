const CACHE = new Map();
const DEFAULT_TTL_MS = 60 * 1000;

function cacheKey(slug) {
  return String(slug || '').trim();
}

function getBoardCache(slug) {
  const key = cacheKey(slug);
  const entry = CACHE.get(key);
  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    CACHE.delete(key);
    return null;
  }

  return entry.value;
}

function setBoardCache(slug, value, ttlMs = DEFAULT_TTL_MS) {
  const key = cacheKey(slug);
  if (!key) {
    return;
  }

  CACHE.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

function invalidateBoardCache(slug) {
  const key = cacheKey(slug);
  if (!key) {
    CACHE.clear();
    return;
  }

  CACHE.delete(key);
}

module.exports = {
  getBoardCache,
  setBoardCache,
  invalidateBoardCache,
};
