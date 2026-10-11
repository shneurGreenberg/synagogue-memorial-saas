import { buildBoardPresenceUrl, buildSidebarApiUrl } from './settings';
import { prepareCommunityEvents } from './announcements';

const CACHE_PREFIX = 'sidebar-app-cached-payload';
const SCREEN_KEY = 'kaddish-screen-id';

function hasDeathDate(person) {
  const death = person && person.gregorianDateOfDeath;
  const month = Number(death && death.month);
  const date = Number(death && death.date);
  const year = Number(death && death.year);
  if (!Number.isInteger(month) || !Number.isInteger(date) || !Number.isInteger(year)) {
    return false;
  }
  if (month < 1 || month > 12 || date < 1 || date > 31 || year < 1 || year > 9999) {
    return false;
  }
  const probe = new Date(year, month - 1, date);
  return probe.getFullYear() === year && probe.getMonth() === month - 1 && probe.getDate() === date;
}

function sanitizePeople(people) {
  if (!Array.isArray(people)) {
    return people;
  }

  return people.map((person) => {
    if (hasDeathDate(person)) {
      return { ...person, hasDeathDate: true, passedToday: !!person.passedToday };
    }

    return {
      ...person,
      gregorianDateOfDeath: null,
      hebrewDateOfDeath: null,
      hasDeathDate: false,
      passedToday: false,
    };
  });
}

function screenId() {
  try {
    const existing = localStorage.getItem(SCREEN_KEY);
    if (existing && /^[A-Za-z0-9_-]{8,64}$/.test(existing)) {
      return existing;
    }
    const raw = window.crypto && typeof window.crypto.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `screen${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
    const next = raw.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
    const safe = next.length >= 8 ? next : `screen${Date.now()}`;
    localStorage.setItem(SCREEN_KEY, safe);
    return safe;
  } catch {
    return `screen${Date.now()}`;
  }
}

export function sanitizeSidebarPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  return {
    ...payload,
    people: sanitizePeople(payload.people),
  };
}

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

  return sanitizeSidebarPayload({
    ...cached,
    communityEvents: prepareCommunityEvents(cached.communityEvents, lang),
  });
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
  const prepared = sanitizeSidebarPayload({
    ...payload,
    communityEvents: prepareCommunityEvents(payload.communityEvents, lang),
  });

  await writeCache(prepared, lang);
  return prepared;
}

export async function reportSidebarPresence(settings, publishedVersion) {
  const url = buildBoardPresenceUrl(settings);
  if (!url) {
    return;
  }

  await fetch(url, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      screenId: screenId(),
      client: 'sidebar',
      publishedVersion: Number(publishedVersion) || 1,
      label: 'sidebar',
    }),
  });
}
