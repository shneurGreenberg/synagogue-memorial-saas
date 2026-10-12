const { computePeopleRevision } = require('./people-revision');
const { buildYahrzeitPageEntries, buildYahrzeitWeekMissedEntries } = require('./yahrzeit-reminders');
const { buildYahrzeitEntries, getDayKeyInTimezone, resolveSynagogueTimezone, resolveYahrzeitOptions } = require('./yahrzeit');
const { getWeeklyKaddishEntries, getKaddishWeek } = require('./weekly-kaddish');

const DEFAULT_TTL_MS = 15 * 1000;
const CACHE = new Map();

function cacheKeyForSynagogue(slug, suffix) {
  return `${String(slug || '').trim()}:${suffix}`;
}

function getCachedEntry(key) {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    CACHE.delete(key);
    return null;
  }
  return entry.value;
}

function setCachedEntry(key, value, ttlMs = DEFAULT_TTL_MS) {
  CACHE.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function buildTimeScopeKey(synagogue, now = new Date()) {
  const timezone = resolveSynagogueTimezone(synagogue);
  const dayKey = getDayKeyInTimezone(timezone, now);
  const week = getKaddishWeek(timezone, now);
  const options = resolveYahrzeitOptions(synagogue);
  const revision = computePeopleRevision(synagogue && synagogue.people);
  return `${dayKey}:${week.weekKey}:${revision}:${options.includeHebrewYahrzeit ? '1' : '0'}`;
}

function invalidateAdminYahrzeitCache(slug) {
  const prefix = slug ? `${String(slug).trim()}:` : '';
  if (!prefix) {
    CACHE.clear();
    return;
  }
  for (const key of CACHE.keys()) {
    if (key.startsWith(prefix)) {
      CACHE.delete(key);
    }
  }
}

function getCachedYahrzeitTodayCount(synagogue, now = new Date()) {
  const slug = synagogue && synagogue.slug;
  if (!slug) {
    return buildYahrzeitEntries(synagogue, now).length;
  }
  const scope = buildTimeScopeKey(synagogue, now);
  const key = cacheKeyForSynagogue(slug, `count:${scope}`);
  const hit = getCachedEntry(key);
  if (hit != null) {
    return hit;
  }
  const count = buildYahrzeitEntries(synagogue, now).length;
  setCachedEntry(key, count);
  return count;
}

function getCachedAdminYahrzeitBundle(synagogue, { now = new Date(), adminLanguage } = {}) {
  const slug = synagogue && synagogue.slug;
  const lang = adminLanguage || (synagogue && synagogue.adminLanguage) || 'ru';
  if (!slug) {
    return {
      entries: buildYahrzeitPageEntries(synagogue, now, lang),
      weekEntries: buildYahrzeitWeekMissedEntries(synagogue, now, lang),
      weeklyKaddish: getWeeklyKaddishEntries(synagogue, now),
      yahrzeitTodayCount: buildYahrzeitEntries(synagogue, now).length,
      dayKey: getDayKeyInTimezone(resolveSynagogueTimezone(synagogue), now),
    };
  }

  const scope = buildTimeScopeKey(synagogue, now);
  const key = cacheKeyForSynagogue(slug, `bundle:${scope}:${lang}`);
  const hit = getCachedEntry(key);
  if (hit) {
    return hit;
  }

  const timezone = resolveSynagogueTimezone(synagogue);
  const value = {
    entries: buildYahrzeitPageEntries(synagogue, now, lang),
    weekEntries: buildYahrzeitWeekMissedEntries(synagogue, now, lang),
    weeklyKaddish: getWeeklyKaddishEntries(synagogue, now),
    yahrzeitTodayCount: buildYahrzeitEntries(synagogue, now).length,
    dayKey: getDayKeyInTimezone(timezone, now),
  };
  setCachedEntry(key, value);
  setCachedEntry(cacheKeyForSynagogue(slug, `count:${scope}`), value.yahrzeitTodayCount);
  return value;
}

module.exports = {
  getCachedAdminYahrzeitBundle,
  getCachedYahrzeitTodayCount,
  invalidateAdminYahrzeitCache,
  buildTimeScopeKey,
  _cacheForTests: CACHE,
};
