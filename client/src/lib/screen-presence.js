const STORAGE_KEY = 'kaddish-screen-id';

export function getOrCreateScreenId() {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing && /^[A-Za-z0-9_-]{8,64}$/.test(existing)) {
      return existing;
    }

    const raw = window.crypto && typeof window.crypto.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `screen${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
    const screenId = raw.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
    const safe = screenId.length >= 8 ? screenId : `screen${Date.now()}`;
    window.localStorage.setItem(STORAGE_KEY, safe);
    return safe;
  } catch {
    return `screen${Date.now()}`;
  }
}

export function detectBoardClient() {
  const display = new URLSearchParams(window.location.search).get('display');
  if (display === 'presentation' || display === 'sidebar' || display === 'android') {
    return display;
  }

  return 'board';
}

export function readScreenLabel() {
  return new URLSearchParams(window.location.search).get('screen') || '';
}

export function readPublishedBoardVersion() {
  const value = Number(window.publishedBoardVersion);
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
}

export async function reportScreenPresence(slug, publishedVersion) {
  if (!slug) {
    return;
  }

  await fetch(`/s/${encodeURIComponent(slug)}/api/board/presence`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      screenId: getOrCreateScreenId(),
      client: detectBoardClient(),
      label: readScreenLabel(),
      publishedVersion,
    }),
  });
}
