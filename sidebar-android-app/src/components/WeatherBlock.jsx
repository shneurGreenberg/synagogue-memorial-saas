import React, { useEffect, useState } from 'react';
import {
  fetchWeatherForecast,
  formatLocalTime,
  getTodaySunTimes,
  weatherLabelKey,
} from '../lib/weather';
import { loadCachedWeather } from '../lib/weather-cache';
import { t } from '../lib/i18n';

function WeatherIcon({ code, className = '' }) {
  const key = weatherLabelKey(code);
  return <span className={`weather-icon weather-icon-${key} ${className}`.trim()} aria-hidden="true" />;
}

function TodaySunStack({ lang, sunTimes, locale }) {
  if (!sunTimes) {
    return null;
  }

  return (
    <div className="weather-sun-stack">
      <div className="weather-sun-stack-row">
        <span className="weather-sun-label">{t(lang, 'sunrise_label')}</span>
        <span className="weather-sun-separator" aria-hidden="true">&nbsp;</span>
        <span className="weather-sun-time">{formatLocalTime(sunTimes.sunrise, locale)}</span>
      </div>
      <div className="weather-sun-stack-row">
        <span className="weather-sun-label">{t(lang, 'sunset_label')}</span>
        <span className="weather-sun-separator" aria-hidden="true">&nbsp;</span>
        <span className="weather-sun-time">{formatLocalTime(sunTimes.sunset, locale)}</span>
      </div>
    </div>
  );
}

export function WeatherBlock({
  lat, long, lang, serverUrl, slug, showWeather, showSunTimes, onForecastChange,
}) {
  const [forecast, setForecast] = useState(() => loadCachedWeather(lat, long));
  const [failed, setFailed] = useState(false);
  const locale = lang === 'he' ? 'he-IL' : lang === 'en' ? 'en-US' : 'ru-RU';

  useEffect(() => {
    if (typeof onForecastChange === 'function') {
      onForecastChange(forecast);
    }
  }, [forecast, onForecastChange]);

  useEffect(() => {
    let cancelled = false;
    let retryTimer = null;

    const load = (attempt = 0) => fetchWeatherForecast(lat, long, serverUrl, slug)
      .then((data) => {
        if (!cancelled && data) {
          setForecast(data);
          setFailed(false);
        }
      })
      .catch(() => {
        if (cancelled) return;
        const cached = loadCachedWeather(lat, long);
        if (cached) {
          setForecast(cached);
          setFailed(false);
          return;
        }
        if (attempt < 2) {
          retryTimer = window.setTimeout(() => load(attempt + 1), 1500 * (attempt + 1));
          return;
        }
        setFailed(true);
      });

    load();

    const timer = window.setInterval(() => load(), 30 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [lat, long, serverUrl, slug]);

  if (!showWeather && !showSunTimes) {
    return null;
  }

  const sunTimes = getTodaySunTimes(forecast);
  const currentCode = forecast?.current?.weather_code;
  const currentTemp = forecast?.current?.temperature_2m;
  const upcoming = (forecast?.daily?.time || []).slice(1, 4).map((date, index) => ({
    date,
    code: forecast.daily.weather_code[index + 1],
    max: Math.round(forecast.daily.temperature_2m_max[index + 1]),
    min: Math.round(forecast.daily.temperature_2m_min[index + 1]),
  }));

  return (
    <div className="board-weather-block">
      <div className="weather-panel weather-panel-compact">
        {showWeather && forecast && (
          <>
            <div className="weather-today-card">
              <div className="weather-today-left">
                <WeatherIcon code={currentCode} className="weather-today-icon" />
                <div className="weather-today-temp">{Math.round(currentTemp)}°</div>
              </div>
              <div className="weather-today-right">
                {showSunTimes && (
                  <TodaySunStack lang={lang} sunTimes={sunTimes} locale={locale} />
                )}
                <div className="weather-today-label">{t(lang, `weather_${weatherLabelKey(currentCode)}`)}</div>
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
          </>
        )}
        {failed && !forecast && <p className="weather-unavailable">{t(lang, 'weather_unknown')}</p>}
      </div>
    </div>
  );
}
