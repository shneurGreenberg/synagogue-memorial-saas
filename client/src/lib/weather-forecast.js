import { getBoardSlug } from './board-slug';

const CACHE_PREFIX = 'board-weather-v2';
const REFRESH_MS = 60 * 60 * 1000;
const STALE_MS = 6 * 60 * 60 * 1000;
const RETRY_DELAYS_MS = [0, 2000, 5000, 15000];

function cacheKey(lat, long) {
  return `${CACHE_PREFIX}:${lat.toFixed(4)},${long.toFixed(4)}`;
}

export function isValidForecast(data) {
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

async function requestJson(url) {
  if (typeof fetch === 'function') {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Weather request failed (${response.status})`);
    }
    return response.json();
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (err) {
          reject(err);
        }
        return;
      }
      reject(new Error(`Weather request failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Weather network error'));
    xhr.send();
  });
}

export async function fetchWeatherForecast(lat, long, slug = getBoardSlug()) {
  const urls = [];

  if (slug) {
    urls.push(`/s/${slug}/api/weather`);
  }

  urls.push(buildDirectOpenMeteoUrl(lat, long));

  let lastError = null;
  for (let index = 0; index < urls.length; index += 1) {
    try {
      const data = await requestJson(urls[index]);
      if (!isValidForecast(data)) {
        throw new Error('Weather response missing forecast data');
      }
      return data;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Weather unavailable');
}

function buildDirectOpenMeteoUrl(lat, long) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(long),
    current: 'temperature_2m,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset',
    timezone: 'auto',
    forecast_days: '4',
  });

  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

export function getTodaySunTimes(forecast) {
  if (!forecast?.daily?.sunrise?.[0] || !forecast?.daily?.sunset?.[0]) {
    return null;
  }

  return {
    sunrise: forecast.daily.sunrise[0],
    sunset: forecast.daily.sunset[0],
  };
}

export function formatLocalTime(value, locale = 'en-GB') {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  try {
    return date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}

export function loadWeatherForecast(lat, long, { slug, onSuccess, onSettled, isActive }) {
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
      const data = await fetchWeatherForecast(lat, long, slug);
      applyForecast(data);
      if (isActive()) {
        onSettled({ loading: false, failed: false });
      }
      return;
    } catch {
      const delay = RETRY_DELAYS_MS[attempt + 1];
      if (delay === undefined || !isActive()) {
        if (isActive()) {
          onSettled({ loading: false, failed: true });
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

export { REFRESH_MS };
