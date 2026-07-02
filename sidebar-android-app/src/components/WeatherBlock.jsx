import React, { useEffect, useState } from 'react';
import {
  fetchWeatherForecast,
  formatLocalTime,
  getTodaySunTimes,
  weatherLabelKey,
} from '../lib/weather';
import { t } from '../lib/i18n';

function WeatherIcon({ code }) {
  const key = weatherLabelKey(code);
  return <span className={`weather-icon weather-icon-${key}`} aria-hidden="true" />;
}

export function WeatherBlock({
  lat, long, lang, serverUrl, slug, showWeather, showSunTimes,
}) {
  const [forecast, setForecast] = useState(null);
  const [failed, setFailed] = useState(false);
  const locale = lang === 'he' ? 'he-IL' : lang === 'en' ? 'en-US' : 'ru-RU';

  useEffect(() => {
    let cancelled = false;

    fetchWeatherForecast(lat, long, serverUrl, slug)
      .then((data) => {
        if (!cancelled) {
          setForecast(data);
          setFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    const timer = window.setInterval(() => {
      fetchWeatherForecast(lat, long, serverUrl, slug)
        .then((data) => {
          if (!cancelled) {
            setForecast(data);
            setFailed(false);
          }
        })
        .catch(() => {
          if (!cancelled) setFailed(true);
        });
    }, 60 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [lat, long, serverUrl, slug]);

  if (!showWeather && !showSunTimes) {
    return null;
  }

  const sunTimes = getTodaySunTimes(forecast);
  const currentCode = forecast?.current?.weather_code;
  const currentTemp = forecast?.current?.temperature_2m;

  return (
    <div className="board-weather-block">
      <div className="weather-panel weather-panel-compact">
        {showWeather && forecast && (
          <div className="weather-today-card">
            <div className="weather-today-left">
              <WeatherIcon code={currentCode} />
              <div className="weather-today-temp">{Math.round(currentTemp)}°</div>
            </div>
            <div className="weather-today-right">
              <p className="weather-today-label">{t(lang, `weather_${weatherLabelKey(currentCode)}`)}</p>
              {showSunTimes && sunTimes && (
                <div className="weather-sun-stack">
                  <div className="weather-sun-stack-row">
                    <span className="weather-sun-label">{t(lang, 'sunrise_label')}</span>
                    <span className="weather-sun-time">{formatLocalTime(sunTimes.sunrise, locale)}</span>
                  </div>
                  <div className="weather-sun-stack-row">
                    <span className="weather-sun-label">{t(lang, 'sunset_label')}</span>
                    <span className="weather-sun-time">{formatLocalTime(sunTimes.sunset, locale)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {failed && <p className="weather-unavailable">{t(lang, 'weather_unknown')}</p>}
      </div>
    </div>
  );
}
