import { isStaticSite } from './asset-url';
import { APP_CODE_VERSION } from './app-code-version';
import { sanitizeJewishFeedPayload } from '../../../lib/sanitize-jewish-feed-learning';

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

    const response = await fetch(`/s/${slug}/api/jewish-content?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`jewish-content ${response.status}`);
    }

    const value = sanitizeJewishFeedPayload(await response.json(), safeLang);
    cache.set(key, { at: Date.now(), value });
    return value;
  })();

  inflight.set(key, request);

  try {
    return await request;
  } finally {
    inflight.delete(key);
  }
}
