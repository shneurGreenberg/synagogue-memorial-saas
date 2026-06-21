const https = require('https');

const CACHE_MS = 15 * 60 * 1000;
const cache = new Map();

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SynagogueMemorialBoard/1.0',
      },
    }, (response) => {
      if (response.statusCode && response.statusCode >= 400) {
        reject(new Error(`HTTP ${response.statusCode}`));
        response.resume();
        return;
      }

      let body = '';
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

function isValidForecast(data) {
  return Boolean(data?.current && data?.daily);
}

function buildOpenMeteoUrl(lat, long) {
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

async function fetchWeatherForecast(lat, long) {
  const safeLat = Number(lat);
  const safeLong = Number(long);

  if (!Number.isFinite(safeLat) || !Number.isFinite(safeLong)) {
    throw new Error('Invalid coordinates');
  }

  const cacheKey = `${safeLat.toFixed(4)},${safeLong.toFixed(4)}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_MS) {
    return cached.data;
  }

  const text = await fetchText(buildOpenMeteoUrl(safeLat, safeLong));
  const data = JSON.parse(text);

  if (!isValidForecast(data)) {
    throw new Error('Weather response missing forecast data');
  }

  cache.set(cacheKey, { fetchedAt: Date.now(), data });
  return data;
}

module.exports = {
  fetchWeatherForecast,
  isValidForecast,
};
