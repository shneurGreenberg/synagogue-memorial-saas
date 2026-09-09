import React, { useEffect, useMemo, useState } from 'react';
import { withTranslation } from 'react-i18next';
import { getBoardData } from '../lib/board-data';
import { useBoardData } from '../context/BoardDataContext';
import { getBoardSlug } from '../lib/board-slug';
import {
  formatLocalTime,
  getTodaySunTimes,
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
  const key = WMO_LABELS[code] || 'unknown';
  return <span className={`weather-icon weather-icon-${key} ${className || ''}`} aria-hidden="true" />;
}

function useBoardWeather(coords) {
  const slug = getBoardSlug();
  const [forecast, setForecast] = useState(() => (
    coords ? readWeatherCache(coords.lat, coords.long) : null
  ));
  const [loading, setLoading] = useState(() => (
    Boolean(coords && !readWeatherCache(coords.lat, coords.long))
  ));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!coords) {
      setForecast(null);
      setLoading(false);
      setFailed(false);
      return undefined;
    }

    const { lat, long } = coords;
    let active = true;

    const cached = readWeatherCache(lat, long);
    if (cached) {
      setForecast(cached);
      setLoading(false);
      setFailed(false);
    } else {
      setLoading(true);
      setFailed(false);
    }

    const stop = loadWeatherForecast(lat, long, {
      slug,
      isActive: () => active,
      onSuccess: setForecast,
      onSettled: ({ loading: nextLoading, failed: nextFailed }) => {
        setLoading(nextLoading);
        setFailed(nextFailed);
      },
    });

    return () => {
      active = false;
      stop();
    };
  }, [coords?.lat, coords?.long, slug]);

  return { forecast, loading, failed };
}

function TodaySunStack({ t, sunTimes, locale }) {
  if (!sunTimes) {
    return null;
  }

  return (
    <div className="weather-sun-stack">
      <div className="weather-sun-stack-row">
        <span className="weather-sun-label">{t('sunrise_label')}</span>
        <span className="weather-sun-separator" aria-hidden="true">&nbsp;</span>
        <span className="weather-sun-time">{formatLocalTime(sunTimes.sunrise, locale)}</span>
      </div>
      <div className="weather-sun-stack-row">
        <span className="weather-sun-label">{t('sunset_label')}</span>
        <span className="weather-sun-separator" aria-hidden="true">&nbsp;</span>
        <span className="weather-sun-time">{formatLocalTime(sunTimes.sunset, locale)}</span>
      </div>
    </div>
  );
}

function BoardWeatherSectionBase({ t, uiLang, showWeather, showSunTimes }) {
  const appData = getBoardData();
  const location = appData.location || {};
  const coords = useMemo(
    () => parseWeatherCoordinates({ lat: Number(location.lat), long: Number(location.long) }),
    [location.lat, location.long],
  );
  const { forecast, loading, failed } = useBoardWeather(coords);
  const locale = LOCALE_MAP[uiLang] || LOCALE_MAP.ru;
  const sunTimes = getTodaySunTimes(forecast);
  const hasForecast = isValidForecast(forecast);

  if (!showWeather && !showSunTimes) {
    return null;
  }

  if (!hasForecast) {
    if (loading) {
      return (
        <div className="board-weather-block">
          <section className="weather-panel weather-panel-loading" aria-label={t('weather_title')}>
            <h2>{showSunTimes ? t('sun_times_title') : t('weather_title')}</h2>
            <p className="weather-loading">{t('weather_loading')}</p>
          </section>
        </div>
      );
    }

    if (failed) {
      return (
        <div className="board-weather-block">
          <section className="weather-panel weather-panel-unavailable" aria-label={t('weather_title')}>
            <h2>{showSunTimes ? t('sun_times_title') : t('weather_title')}</h2>
            <p className="weather-unavailable">{t('weather_unavailable')}</p>
          </section>
        </div>
      );
    }

    return null;
  }

  const todayCode = forecast.current.weather_code;
  const todayTemp = Math.round(forecast.current.temperature_2m);
  const upcoming = (forecast.daily.time || []).slice(1, 4).map((date, index) => ({
    date,
    code: forecast.daily.weather_code[index + 1],
    max: Math.round(forecast.daily.temperature_2m_max[index + 1]),
    min: Math.round(forecast.daily.temperature_2m_min[index + 1]),
  }));

  return (
    <div className="board-weather-block">
      {showWeather && (
        <section className="weather-panel weather-panel-compact" aria-label={t('weather_title')}>
          <div className="weather-today-card">
            <div className="weather-today-left">
              <WeatherIcon code={todayCode} className="weather-today-icon" />
              <div className="weather-today-temp">{todayTemp}°</div>
            </div>
            <div className="weather-today-right">
              {showSunTimes && (
                <TodaySunStack t={t} sunTimes={sunTimes} locale={locale} />
              )}
              <div className="weather-today-label">{weatherLabel(t, todayCode)}</div>
            </div>
          </div>
          {upcoming.length > 0 && (
            <ul className="weather-upcoming-grid">
              {upcoming.map((day) => (
                <li key={day.date} className="weather-cube">
                  <span className="weather-cube-date">
                    {new Date(`${day.date}T12:00:00`).toLocaleDateString(locale, {
                      weekday: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <WeatherIcon code={day.code} className="weather-cube-icon" />
                  <span className="weather-cube-temps">
                    {day.max}°<span className="weather-cube-sep">/</span>{day.min}°
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!showWeather && showSunTimes && sunTimes && (
        <section className="weather-panel weather-panel-sun-only" aria-label={t('sun_times_title')}>
          <h2>{t('sun_times_title')}</h2>
          <TodaySunStack t={t} sunTimes={sunTimes} locale={locale} />
        </section>
      )}
    </div>
  );
}

function BoardWeatherSectionConnected(props) {
  const { uiLang } = useBoardData();
  return <BoardWeatherSectionBase {...props} uiLang={uiLang} />;
}

export const BoardWeatherSection = withTranslation()(BoardWeatherSectionConnected);

export const WeatherPanel = BoardWeatherSection;
