import React, { useEffect, useMemo, useState } from 'react';
import { withTranslation } from 'react-i18next';
import { getBoardData } from '../lib/board-data';
import { useBoardData } from '../context/BoardDataContext';
import {
  isValidForecast,
  loadWeatherForecast,
  parseWeatherCoordinates,
  readWeatherCache,
} from '../lib/weather-forecast';

const LOCALE_MAP = {
  ru: 'ru-RU',
  he: 'he-IL',
  en: 'en-US',
};

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

function weatherLabel(t, code) {
  const key = WMO_LABELS[code] || 'unknown';
  return t(`weather_${key}`, { defaultValue: t('weather_unknown') });
}

function WeatherIcon({ code, className }) {
  const label = WMO_LABELS[code] || 'unknown';
  return <span className={`weather-icon weather-icon-${label} ${className || ''}`} aria-hidden="true" />;
}

function WeatherPanelBase({ t, uiLang }) {
  const appData = getBoardData();
  const location = appData.location || {};
  const latKey = Number(location.lat);
  const longKey = Number(location.long);
  const coords = useMemo(
    () => parseWeatherCoordinates({ lat: latKey, long: longKey }),
    [latKey, longKey],
  );
  const [forecast, setForecast] = useState(() => (
    coords ? readWeatherCache(coords.lat, coords.long) : null
  ));
  const [loading, setLoading] = useState(() => (
    Boolean(coords && !readWeatherCache(coords.lat, coords.long))
  ));

  useEffect(() => {
    if (!coords) {
      setForecast(null);
      setLoading(false);
      return undefined;
    }

    const { lat, long } = coords;
    let active = true;

    const cached = readWeatherCache(lat, long);
    if (cached) {
      setForecast(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const stop = loadWeatherForecast(lat, long, {
      isActive: () => active,
      onSuccess: setForecast,
      onSettled: () => setLoading(false),
    });

    return () => {
      active = false;
      stop();
    };
  }, [coords?.lat, coords?.long]);

  if (!isValidForecast(forecast)) {
    if (!loading) {
      return null;
    }

    return (
      <section className="weather-panel weather-panel-loading" aria-label={t('weather_title')}>
        <h2>{t('weather_title')}</h2>
        <p className="weather-loading">{t('weather_loading')}</p>
      </section>
    );
  }

  const locale = LOCALE_MAP[uiLang] || LOCALE_MAP.ru;
  const todayCode = forecast.current.weather_code;
  const todayTemp = Math.round(forecast.current.temperature_2m);
  const upcoming = (forecast.daily.time || []).slice(1, 4).map((date, index) => ({
    date,
    code: forecast.daily.weather_code[index + 1],
    max: Math.round(forecast.daily.temperature_2m_max[index + 1]),
    min: Math.round(forecast.daily.temperature_2m_min[index + 1]),
  }));

  return (
    <section className="weather-panel" aria-label={t('weather_title')}>
      <h2>{t('weather_title')}</h2>
      <div className="weather-today">
        <WeatherIcon code={todayCode} className="weather-today-icon" />
        <div className="weather-today-main">
          <div className="weather-today-temp">{todayTemp}°</div>
          <div className="weather-today-label">{weatherLabel(t, todayCode)}</div>
        </div>
      </div>
      {upcoming.length > 0 && (
        <ul className="weather-upcoming">
          {upcoming.map((day) => (
            <li key={day.date} className="weather-upcoming-day">
              <span className="weather-upcoming-date">
                {new Date(`${day.date}T12:00:00`).toLocaleDateString(locale, {
                  weekday: 'short',
                  day: 'numeric',
                })}
              </span>
              <WeatherIcon code={day.code} className="weather-upcoming-icon" />
              <span className="weather-upcoming-temps">
                {day.max}° / {day.min}°
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function WeatherPanelConnected(props) {
  const { uiLang } = useBoardData();
  return <WeatherPanelBase {...props} uiLang={uiLang} />;
}

export const WeatherPanel = withTranslation()(WeatherPanelConnected);
