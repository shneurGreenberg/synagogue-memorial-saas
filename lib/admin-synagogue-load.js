const Synagogue = require('../models/Synagogue');
const { invalidateAdminYahrzeitCache } = require('./admin-yahrzeit-cache');
const { clearAdminYahrzeitPersistedCaches } = require('./admin-yahrzeit-persisted');

const DEFAULT_TTL_MS = 15 * 1000;
const CACHE = new Map();

/** Fields needed only for permissions and saved-view repair. */
const SELECT_CONTEXT = 'slug adminUsers savedViews';

/**
 * Settings shell: everything for admin layout/settings except heavy person blobs.
 * People array keeps id, name, dates, photo refs for nav yahrzeit/undated counts.
 */
const SELECT_SETTINGS = [
  SELECT_CONTEXT,
  // 1.29 (G5): `language` and every other field rendered in settings forms must be selected,
  // otherwise the form shows a default and the next Save writes that default back.
  'name title titles language weeklyChapterEnabled boardMode prayerTimes adminLanguage adminTheme adminPasswordHash',
  'theme boardFeatures publicSubmission yahrzeitReminders memorialQrPanel',
  'savedViews activeSavedViewId slideshow communityEvents contactDirectory',
  'location shabbatTimesEnabled boardHideSearchAndPager weeklyKaddishReminderEnabled publishedVersion publishedAt boardClients',
  'lastRefreshedCodeVersion provisioning boardSubtitle boardTitleText',
  'adminYahrzeitTodayCache',
  'people.id people.name people.gregorianDateOfDeath people.hebrewDateOfDeath people.photo people.title people.permanent people.permanentUntil',
].join(' ');

const SELECT_PEOPLE = `${SELECT_SETTINGS} people.text people.contact people.contacts people.photoCrop people.internalNotes personAddRequests`;

/** Yahrzeit admin page: contacts and photos, without biography text. */
const SELECT_YAHRZEIT = [
  SELECT_SETTINGS,
  'people.contact people.contacts people.photoCrop weeklyKaddishWhatsapp weeklyKaddishConfirmation adminWeeklyKaddishCache',
].join(' ').replace('people.text ', '');

const PROFILES = {
  context: SELECT_CONTEXT,
  settings: SELECT_SETTINGS,
  yahrzeit: SELECT_YAHRZEIT,
  people: SELECT_PEOPLE,
  full: undefined,
};

function cacheKey(slug, profile) {
  return `${String(slug || '').trim()}:${profile}`;
}

function getCached(slug, profile) {
  const entry = CACHE.get(cacheKey(slug, profile));
  if (!entry) {
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    CACHE.delete(cacheKey(slug, profile));
    return null;
  }
  return entry.value;
}

function setCached(slug, profile, value, ttlMs = DEFAULT_TTL_MS) {
  const key = cacheKey(slug, profile);
  if (!key.startsWith(':')) {
    CACHE.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}

function invalidateAdminSynagogueCache(slug) {
  const prefix = slug ? `${String(slug).trim()}:` : '';
  if (!prefix) {
    CACHE.clear();
  } else {
    for (const key of CACHE.keys()) {
      if (key.startsWith(prefix)) {
        CACHE.delete(key);
      }
    }
  }
  invalidateAdminYahrzeitCache(slug);
  clearAdminYahrzeitPersistedCaches(slug);
}

/**
 * @param {string} slug
 * @param {'context'|'settings'|'yahrzeit'|'people'|'full'} profile
 * @param {{ lean?: boolean, useCache?: boolean }} [options]
 */
async function loadAdminSynagogue(slug, profile = 'settings', options = {}) {
  const safeSlug = String(slug || '').trim();
  if (!safeSlug) {
    return null;
  }

  const useCache = options.useCache !== false;
  if (useCache) {
    const hit = getCached(safeSlug, profile);
    if (hit) {
      return hit;
    }
  }

  const select = PROFILES[profile];
  let query = Synagogue.findOne({ slug: safeSlug });
  if (select) {
    query = query.select(select);
  }
  if (options.lean !== false) {
    query = query.lean();
  }

  const doc = await query;
  if (doc && useCache) {
    setCached(safeSlug, profile, doc);
  }
  return doc;
}

module.exports = {
  SELECT_CONTEXT,
  SELECT_SETTINGS,
  SELECT_PEOPLE,
  SELECT_YAHRZEIT,
  PROFILES,
  loadAdminSynagogue,
  invalidateAdminSynagogueCache,
  _cacheForTests: CACHE,
};
