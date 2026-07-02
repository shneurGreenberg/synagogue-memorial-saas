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

export async function fetchWeatherForecast(lat, long, serverUrl, slug) {
  const urls = [];

  if (serverUrl && slug) {
    const base = serverUrl.replace(/\/+$/, '');
    urls.push(`${base}/s/${encodeURIComponent(slug)}/api/weather`);
  }

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(long),
    current: 'temperature_2m,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset',
    timezone: 'auto',
    forecast_days: '4',
  });
  urls.push(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);

  let lastError = null;
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Weather ${response.status}`);
      }

      const data = await response.json();
      if (!data?.current || !data?.daily) {
        throw new Error('Invalid weather payload');
      }

      return data;
    } catch (err) {
      lastError = err;
    }
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
