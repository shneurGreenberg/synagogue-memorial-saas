import { buildSidebarApiUrl } from './settings';
import { prepareCommunityEvents } from './announcements';

const CACHE_PREFIX = 'sidebar-app-cached-payload';

function cacheKey(lang) {
  return `${CACHE_PREFIX}:${lang || 'ru'}`;
}

async function readCache(lang) {
  const key = cacheKey(lang);
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key });
    return value ? JSON.parse(value) : null;
  } catch {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }
}

async function writeCache(payload, lang) {
  const serialized = JSON.stringify(payload);
  const key = cacheKey(lang);

  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key, value: serialized });
  } catch {
    localStorage.setItem(key, serialized);
  }
}

export async function loadCachedSidebarPayload(lang) {
  const cached = await readCache(lang);
  if (!cached) {
    return null;
  }

  return {
    ...cached,
    communityEvents: prepareCommunityEvents(cached.communityEvents, lang),
  };
}

export async function fetchSidebarPayload(settings, lang) {
  const url = buildSidebarApiUrl(settings, lang);
  if (!url) {
    return null;
  }

  const response = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Server ${response.status}`);
  }

  const payload = await response.json();
  const prepared = {
    ...payload,
    communityEvents: prepareCommunityEvents(payload.communityEvents, lang),
  };

  await writeCache(prepared, lang);
  return prepared;
}
