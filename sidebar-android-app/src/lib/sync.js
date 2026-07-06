import { buildSidebarApiUrl } from './settings';
import { prepareCommunityEvents } from './announcements';

const CACHE_KEY = 'sidebar-app-cached-payload';

async function readCache() {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key: CACHE_KEY });
    return value ? JSON.parse(value) : null;
  } catch {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}

async function writeCache(payload) {
  const serialized = JSON.stringify(payload);
  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key: CACHE_KEY, value: serialized });
  } catch {
    localStorage.setItem(CACHE_KEY, serialized);
  }
}

export async function loadCachedSidebarPayload(lang) {
  const cached = await readCache();
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

  await writeCache(prepared);
  return prepared;
}
