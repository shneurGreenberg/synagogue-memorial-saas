const CACHE_PREFIX = 'board-weather-v1';
const REFRESH_MS = 60 * 60 * 1000;
const STALE_MS = 6 * 60 * 60 * 1000;
const RETRY_DELAYS_MS = [0, 2000, 5000, 15000];

function cacheKey(lat, long) {
  return `${CACHE_PREFIX}:${lat.toFixed(4)},${long.toFixed(4)}`;
}

function isValidForecast(data) {
  return Boolean(data?.current && data?.daily);
}

export function parseWeatherCoordinates(location) {
  const lat = Number(location?.lat);
  const long = Number(location?.long);

  if (!Number.isFinite(lat) || !Number.isFinite(long)) {
    return null;
  }

  return { lat, long };
}

export function readWeatherCache(lat, long) {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(cacheKey(lat, long));
    if (!raw) {
      return null;
    }

    const entry = JSON.parse(raw);
    if (!entry?.fetchedAt || !isValidForecast(entry.data)) {
      return null;
    }

    if (Date.now() - entry.fetchedAt > STALE_MS) {
      window.sessionStorage.removeItem(cacheKey(lat, long));
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

export function writeWeatherCache(lat, long, data) {
  if (typeof window === 'undefined' || !window.sessionStorage || !isValidForecast(data)) {
    return;
  }

  try {
    window.sessionStorage.setItem(cacheKey(lat, long), JSON.stringify({
      fetchedAt: Date.now(),
      data,
    }));
  } catch {
    /* ignore quota errors */
  }
}

export async function fetchWeatherForecast(lat, long) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(long),
    current: 'temperature_2m,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
    forecast_days: '4',
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Weather request failed (${response.status})`);
  }

  const data = await response.json();
  if (!isValidForecast(data)) {
    throw new Error('Weather response missing forecast data');
  }

  return data;
}

export function loadWeatherForecast(lat, long, { onSuccess, onSettled, isActive }) {
  let retryTimer = null;
  let refreshTimer = null;

  const applyForecast = (data) => {
    writeWeatherCache(lat, long, data);
    if (isActive()) {
      onSuccess(data);
    }
  };

  const load = async (attempt = 0) => {
    if (!isActive()) {
      return;
    }

    try {
      const data = await fetchWeatherForecast(lat, long);
      applyForecast(data);
      if (isActive()) {
        onSettled(false);
      }
      return;
    } catch {
      const delay = RETRY_DELAYS_MS[attempt + 1];
      if (delay === undefined || !isActive()) {
        if (isActive()) {
          onSettled(false);
        }
        return;
      }

      retryTimer = window.setTimeout(() => load(attempt + 1), delay);
    }
  };

  load();
  refreshTimer = window.setInterval(() => load(), REFRESH_MS);

  return () => {
    if (retryTimer) {
      window.clearTimeout(retryTimer);
    }
    if (refreshTimer) {
      window.clearInterval(refreshTimer);
    }
  };
}

export { isValidForecast, REFRESH_MS };
