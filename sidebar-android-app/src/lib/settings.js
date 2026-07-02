export const DEFAULT_SETTINGS = {
  serverUrl: '',
  slug: '',
  language: 'ru',
  useDeviceLocation: true,
  manualLat: '',
  manualLong: '',
  adminPin: '1234',
};

const STORAGE_KEY = 'sidebar-app-settings';
const LOCAL_EVENTS_KEY = 'sidebar-app-local-events';

export async function loadSettings() {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (value) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(value) };
    }
  } catch {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  }

  return { ...DEFAULT_SETTINGS };
}

export async function saveSettings(settings) {
  const payload = JSON.stringify(settings);

  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key: STORAGE_KEY, value: payload });
  } catch {
    localStorage.setItem(STORAGE_KEY, payload);
  }
}

export async function loadLocalEvents() {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key: LOCAL_EVENTS_KEY });
    return value ? JSON.parse(value) : [];
  } catch {
    const raw = localStorage.getItem(LOCAL_EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  }
}

export async function saveLocalEvents(events) {
  const payload = JSON.stringify(events);

  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key: LOCAL_EVENTS_KEY, value: payload });
  } catch {
    localStorage.setItem(LOCAL_EVENTS_KEY, payload);
  }
}

export function normalizeServerUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

export function buildSidebarApiUrl(settings, lang) {
  const base = normalizeServerUrl(settings.serverUrl);
  const slug = String(settings.slug || '').trim();
  if (!base || !slug) {
    return null;
  }

  const params = new URLSearchParams();
  if (lang) {
    params.set('lang', lang);
  }

  const query = params.toString();
  return `${base}/s/${encodeURIComponent(slug)}/api/sidebar-app${query ? `?${query}` : ''}`;
}
