const CACHE_KEY = 'sidebar_weather_cache_v1';
const MAX_AGE_MS = 60 * 60 * 1000;

function cacheKey(lat, long) {
  return `${Number(lat).toFixed(3)}:${Number(long).toFixed(3)}`;
}

export function loadCachedWeather(lat, long) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data?.current || !parsed?.data?.daily) return null;
    if (parsed.key !== cacheKey(lat, long)) return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function saveCachedWeather(lat, long, data) {
  if (!data?.current || !data?.daily) return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      key: cacheKey(lat, long),
      savedAt: Date.now(),
      data,
    }));
  } catch {
    // Ignore storage failures.
  }
}
