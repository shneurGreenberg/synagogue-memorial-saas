const CACHE = new Map();
const DEFAULT_TTL_MS = 5 * 60 * 1000;

function boardContentVersion(board) {
  if (!board) {
    return null;
  }
  const { computeBoardVersion } = require('./board-payload');
  return computeBoardVersion(board);
}

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
    contentVersion: boardContentVersion(value),
    expiresAt: Date.now() + ttlMs,
  });
}

function getBoardContentVersion(slug) {
  const key = cacheKey(slug);
  const entry = CACHE.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    CACHE.delete(key);
    return null;
  }
  return entry.contentVersion || boardContentVersion(entry.value);
}

function invalidateBoardCache(slug) {
  const key = cacheKey(slug);
  if (!key) {
    CACHE.clear();
  } else {
    CACHE.delete(key);
  }

  try {
    const { invalidateAdminYahrzeitCache } = require('./admin-yahrzeit-cache');
    invalidateAdminYahrzeitCache(slug);
  } catch (_) {
    // optional in minimal test setups
  }
}

module.exports = {
  getBoardCache,
  setBoardCache,
  getBoardContentVersion,
  invalidateBoardCache,
};
