import { t } from './i18n';
import { loadCachedWeather, saveCachedWeather } from './weather-cache';

const WMO_LABELS = {
  0: 'clear',
  1: 'mainly_clear',
  2: 'partly_cloudy',
  3: 'overcast',
  45: 'fog',
  48: 'fog',
  51: 'drizzle',
  53: 'drizzle',
  55: 'drizzle',
  61: 'rain',
  63: 'rain',
  65: 'rain',
  71: 'snow',
  73: 'snow',
  75: 'snow',
  80: 'showers',
  81: 'showers',
  82: 'showers',
  95: 'thunderstorm',
};

export function weatherLabelKey(code) {
  return WMO_LABELS[code] || 'unknown';
}

export function weatherIconEmoji(code) {
  if (code === 0) return '☀';
  if (code <= 3) return '⛅';
  if (code <= 48) return '≈';
  if (code <= 67) return '☂';
  if (code <= 77) return '❄';
  if (code <= 82) return '☂';
  if (code >= 95) return '⚡';
  return '°';
}

async function fetchWeatherUrl(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Weather ${response.status}`);
  }

  const data = await response.json();
  if (!data?.current || !data?.daily) {
    throw new Error('Invalid weather payload');
  }

  return data;
}

export async function fetchWeatherForecast(lat, long, serverUrl, slug) {
  const openMeteoParams = new URLSearchParams({
    latitude: String(lat),
    longitude: String(long),
    current: 'temperature_2m,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,time',
    timezone: 'auto',
    forecast_days: '4',
  });
  const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?${openMeteoParams.toString()}`;

  const attempts = [];
  attempts.push(fetchWeatherUrl(openMeteoUrl));

  if (serverUrl && slug) {
    const base = serverUrl.replace(/\/+$/, '');
    attempts.push(fetchWeatherUrl(`${base}/s/${encodeURIComponent(slug)}/api/weather`));
  }

  let lastError = null;
  for (const attempt of attempts) {
    try {
      const data = await attempt;
      saveCachedWeather(lat, long, data);
      return data;
    } catch (err) {
      lastError = err;
    }
  }

  const cached = loadCachedWeather(lat, long);
  if (cached) {
    return cached;
  }

  throw lastError || new Error('Weather unavailable');
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

  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatForecastDay(dateStr, lang) {
  const locale = lang === 'he' ? 'he-IL' : lang === 'en' ? 'en-US' : 'ru-RU';
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
  });
}

export function buildWidgetWeatherJson(forecast, lang = 'ru') {
  if (!forecast?.current) {
    return '';
  }

  const code = forecast.current.weather_code;
  const temp = Math.round(forecast.current.temperature_2m);
  const sunTimes = getTodaySunTimes(forecast);
  const locale = lang === 'he' ? 'he-IL' : lang === 'en' ? 'en-US' : 'ru-RU';

  const payload = {
    weatherTemp: `${temp}°`,
    weatherIcon: weatherIconEmoji(code),
    weatherLabel: t(lang, `weather_${weatherLabelKey(code)}`),
    sunriseText: sunTimes
      ? `${t(lang, 'sunrise_label')}  ${formatLocalTime(sunTimes.sunrise, locale)}`
      : '',
    sunsetText: sunTimes
      ? `${t(lang, 'sunset_label')}  ${formatLocalTime(sunTimes.sunset, locale)}`
      : '',
  };

  const days = (forecast.daily?.time || []).slice(1, 4);
  days.forEach((date, index) => {
    const slot = index + 1;
    const dayCode = forecast.daily.weather_code[index + 1];
    const max = Math.round(forecast.daily.temperature_2m_max[index + 1]);
    const min = Math.round(forecast.daily.temperature_2m_min[index + 1]);
    payload[`forecast${slot}Date`] = formatForecastDay(date, lang);
    payload[`forecast${slot}Icon`] = weatherIconEmoji(dayCode);
    payload[`forecast${slot}Temps`] = `${max}°/${min}°`;
  });

  return JSON.stringify(payload);
}
