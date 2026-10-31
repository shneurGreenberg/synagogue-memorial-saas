import { isStaticSite } from './asset-url';
import { APP_CODE_VERSION } from './app-code-version';
import { sanitizeJewishFeedPayload } from '../../../lib/sanitize-jewish-feed-learning';
import { readOffline, writeOffline, pruneOffline, addDaysToKey } from './offline-cache';

export const OFFLINE_DAYS_AHEAD = 30;

function offlineKey(slug, lang, dayKey) {
  return `feed:${slug || ''}:${lang || 'ru'}:${dayKey}`;
}

/** 1.31.0 I25: feed stored on the device for a given day (from the 30-day prefetch). */
export function readOfflineJewishFeed(slug, lang, dayKey) {
  if (!dayKey) return null;
  const hit = readOffline(offlineKey(slug, lang, dayKey));
  return hit ? sanitizeJewishFeedPayload(hit, lang || 'ru') : null;
}

function storeOfflineFeed(slug, lang, dayKey, value) {
  if (!dayKey || !value) return;
  writeOffline(offlineKey(slug, lang, dayKey), value);
}

let lastPrefetchDay = '';
/** Prefetch ~30 days ahead in small chunks; once per day; silent on failure. */
export async function prefetchJewishFeedRange(slug, lang, todayKey, { days = OFFLINE_DAYS_AHEAD, chunk = 7, fetchImpl } = {}) {
  if (!slug || !todayKey || isStaticSite()) return 0;
  const safeLang = lang || 'ru';
  const runKey = `${slug}:${safeLang}:${todayKey}`;
  if (lastPrefetchDay === runKey) return 0;
  const doFetch = fetchImpl || ((u, o) => fetch(u, o));
  // Drop days older than yesterday.
  const oldest = addDaysToKey(todayKey, -1);
  pruneOffline((k) => {
    const m = /^feed:.*:(\d{4}-\d{2}-\d{2})$/.exec(k);
    return !!m && m[1] < oldest;
  });
  let stored = 0;
  for (let offset = 0; offset < days; offset += chunk) {
    const from = addDaysToKey(todayKey, offset);
    const n = Math.min(chunk, days - offset);
    // Skip chunks already fully cached.
    let missing = false;
    for (let i = 0; i < n; i += 1) {
      if (!readOffline(offlineKey(slug, safeLang, addDaysToKey(from, i)))) { missing = true; break; }
    }
    if (!missing) continue;
    let payload;
    try {
      const params = new URLSearchParams({ lang: safeLang, from, days: String(n), v: APP_CODE_VERSION });
      const res = await doFetch(`/s/${slug}/api/jewish-content/range?${params.toString()}`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (!res.ok) return stored;
      payload = await res.json();
    } catch {
      return stored;
    }
    Object.entries((payload && payload.days) || {}).forEach(([dayKey, feed]) => {
      if (feed) { storeOfflineFeed(slug, safeLang, dayKey, feed); stored += 1; }
    });
  }
  lastPrefetchDay = runKey;
  return stored;
}

export function __resetPrefetchForTests() { lastPrefetchDay = ''; }

const inflight = new Map();
const cache = new Map();
const CLIENT_CACHE_MS = 10 * 60 * 1000;
const STORAGE_PREFIX = `jewish-feed:v${APP_CODE_VERSION}:`;
const LEGACY_STORAGE_PREFIX = 'jewish-feed:';

function purgeLegacyJewishFeedStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key) {
        continue;
      }
      if (key.startsWith(LEGACY_STORAGE_PREFIX) && !key.startsWith(STORAGE_PREFIX)) {
        keys.push(key);
      }
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    /* ignore quota / private mode */
  }
}

purgeLegacyJewishFeedStorage();

function cacheKey(slug, lang, dateKey) {
  return `${STORAGE_PREFIX}${slug || ''}:${lang || 'ru'}:${dateKey || ''}`;
}

function readStaticJewishFeed(lang) {
  if (typeof window === 'undefined') {
    return null;
  }
  const embedded = window.data?.jewishContent;
  if (!embedded) {
    return null;
  }
  return sanitizeJewishFeedPayload(embedded, lang || 'ru');
}

export async function fetchJewishFeed(slug, lang, dateKey = '') {
  if (!slug) {
    return null;
  }

  const safeLang = lang || 'ru';

  if (isStaticSite()) {
    return readStaticJewishFeed(safeLang);
  }

  const key = cacheKey(slug, safeLang, dateKey);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CLIENT_CACHE_MS) {
    return hit.value;
  }

  if (inflight.has(key)) {
    return inflight.get(key);
  }

  const request = (async () => {
    const params = new URLSearchParams({
      lang: safeLang,
      v: APP_CODE_VERSION,
    });
    if (dateKey) {
      params.set('date', dateKey);
    }

    let value;
    try {
      const response = await fetch(`/s/${slug}/api/jewish-content?${params.toString()}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`jewish-content ${response.status}`);
      }

      value = sanitizeJewishFeedPayload(await response.json(), safeLang);
    } catch (err) {
      // 1.31.0 I25: offline → serve the day from the device cache instead of failing.
      const offline = readOfflineJewishFeed(slug, safeLang, dateKey);
      if (offline) return offline;
      throw err;
    }
    cache.set(key, { at: Date.now(), value });
    // Only store when the server answered for the requested day.
    if (dateKey && (!value.date || value.date === dateKey)) storeOfflineFeed(slug, safeLang, dateKey, value);
    return value;
  })();

  inflight.set(key, request);

  try {
    return await request;
  } finally {
    inflight.delete(key);
  }
}
