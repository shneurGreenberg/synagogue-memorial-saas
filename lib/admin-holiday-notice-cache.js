const { getDayKeyInTimezone } = require('./yahrzeit');

const CACHE = new Map();
const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000;

function cacheKey(lang, dayKey) {
  return `${String(lang || 'ru').trim()}:${dayKey}`;
}

async function getCachedUpcomingHolidayNotice(loader, { lang, timezone, now = new Date() } = {}) {
  const dayKey = getDayKeyInTimezone(timezone || 'Asia/Jerusalem', now);
  const key = cacheKey(lang, dayKey);
  const hit = CACHE.get(key);
  if (hit && Date.now() < hit.expiresAt) {
    return hit.value;
  }
  const value = await loader();
  CACHE.set(key, { value, expiresAt: Date.now() + DEFAULT_TTL_MS });
  return value;
}

function clearAdminHolidayNoticeCache() {
  CACHE.clear();
}

module.exports = {
  getCachedUpcomingHolidayNotice,
  clearAdminHolidayNoticeCache,
  _cacheForTests: CACHE,
};
