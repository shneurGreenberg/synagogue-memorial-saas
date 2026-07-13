const inflight = new Map();
const cache = new Map();
const CLIENT_CACHE_MS = 10 * 60 * 1000;

function cacheKey(slug, lang, dateKey) {
  return `${slug || ''}:${lang || 'ru'}:${dateKey || ''}`;
}

export async function fetchJewishFeed(slug, lang, dateKey = '') {
  if (!slug) {
    return null;
  }

  const key = cacheKey(slug, lang, dateKey);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CLIENT_CACHE_MS) {
    return hit.value;
  }

  if (inflight.has(key)) {
    return inflight.get(key);
  }

  const request = (async () => {
    const params = new URLSearchParams({ lang: lang || 'ru' });
    if (dateKey) {
      params.set('date', dateKey);
    }

    const response = await fetch(`/s/${slug}/api/jewish-content?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`jewish-content ${response.status}`);
    }

    const value = await response.json();
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
