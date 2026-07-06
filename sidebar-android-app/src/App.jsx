import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LiveClock } from './components/LiveClock';
import { ShabbatBlock } from './components/ShabbatBlock';
import { WeatherBlock } from './components/WeatherBlock';
import { ScrollingAnnouncements } from './components/ScrollingAnnouncements';
import { SettingsScreen } from './components/SettingsScreen';
import {
  formatGregorianDate,
  formatHebrewDate,
  getDatesInTimezone,
} from './lib/dates';
import { getDeviceCoordinates, resolveTimezone } from './lib/location';
import {
  buildAnnouncementItems,
  buildWidgetAnnouncementsJson,
} from './lib/announcements';
import { fetchSidebarPayload, loadCachedSidebarPayload } from './lib/sync';
import { fetchOfflineJewishFeed } from './lib/offline-feed';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  normalizeServerUrl,
  normalizeSettings,
  parseServerSettings,
  saveSettings,
} from './lib/settings';
import { t } from './lib/i18n';
import { syncWidgetSnapshot } from './lib/widget-sync';
import { buildWidgetWeatherJson } from './lib/weather';

const DEFAULT_COORDS = { lat: 54.9833, long: 82.8964 };
const DEFAULT_TIMEZONE = 'Asia/Novosibirsk';

export default function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [screen, setScreen] = useState('home');
  const [coords, setCoords] = useState(DEFAULT_COORDS);
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [remotePayload, setRemotePayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [weatherForecast, setWeatherForecast] = useState(null);

  const lang = settings.language || 'ru';
  const handleForecastChange = useCallback((forecast) => {
    setWeatherForecast(forecast || null);
  }, []);

  const refreshLocation = useCallback(async (nextSettings) => {
    try {
      const nextCoords = await getDeviceCoordinates(nextSettings);
      const resolved = nextCoords || DEFAULT_COORDS;
      const nextTimezone = await resolveTimezone(resolved.lat, resolved.long);
      setCoords(resolved);
      setTimezone(nextTimezone);
      setError('');
    } catch (err) {
      setCoords(DEFAULT_COORDS);
      setTimezone(DEFAULT_TIMEZONE);
      setError(t(nextSettings.language || 'ru', 'location_error'));
    }
  }, []);

  const refreshRemote = useCallback(async (nextSettings, { initial = false } = {}) => {
    const normalized = normalizeSettings(nextSettings);
    let cached = null;
    if (initial) {
      cached = await loadCachedSidebarPayload(normalized.language);
      if (cached) {
        setRemotePayload(cached);
      }
    }

    try {
      const payload = await fetchSidebarPayload(normalized, normalized.language);
      setRemotePayload(payload);
      setError('');
    } catch {
      let fallback = cached;
      if (!fallback) {
        fallback = await loadCachedSidebarPayload(normalized.language);
      }

      try {
        const offline = await fetchOfflineJewishFeed(normalized.language);
        const merged = {
          ...(fallback || {}),
          upcomingHolidays: fallback?.upcomingHolidays?.length
            ? fallback.upcomingHolidays
            : offline.upcomingHolidays,
          chabadDates: fallback?.chabadDates?.length ? fallback.chabadDates : offline.chabadDates,
          communityEvents: fallback?.communityEvents || [],
          shabbatTimesEnabled: fallback?.shabbatTimesEnabled !== false,
          location: fallback?.location || {
            lat: DEFAULT_COORDS.lat,
            long: DEFAULT_COORDS.long,
            timezone: DEFAULT_TIMEZONE,
          },
          boardFeatures: fallback?.boardFeatures,
          theme: fallback?.theme,
        };
        setRemotePayload(merged);
        if (merged.upcomingHolidays?.length || merged.chabadDates?.length || merged.communityEvents?.length) {
          setError('');
          return;
        }
      } catch {
        if (fallback) {
          setRemotePayload(fallback);
          if (fallback.upcomingHolidays?.length || fallback.chabadDates?.length || fallback.communityEvents?.length) {
            setError('');
            return;
          }
        }
      }

      if (normalizeServerUrl(normalized.serverUrl) && normalized.slug) {
        setError(t(normalized.language || 'ru', 'sync_error'));
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const loadedSettings = normalizeSettings(await loadSettings());
      if (cancelled) return;

      setSettings(loadedSettings);
      await refreshLocation(loadedSettings);
      await refreshRemote(loadedSettings, { initial: true });
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshLocation, refreshRemote]);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      setRefreshing(true);
      await refreshRemote(settings);
      setRefreshing(false);
    }, 30000);

    return () => window.clearInterval(timer);
  }, [settings, refreshRemote]);

  const synagogueLocation = remotePayload?.location;
  const effectiveCoords = synagogueLocation?.lat != null && synagogueLocation?.long != null
    ? { lat: Number(synagogueLocation.lat), long: Number(synagogueLocation.long) }
    : coords;
  const effectiveTimezone = synagogueLocation?.timezone || timezone;

  const { gregorianDate, hebrewDate } = getDatesInTimezone(effectiveTimezone);
  const boardFeatures = remotePayload?.boardFeatures || {
    officialLogo: true,
    upcomingHolidays: true,
    communityEvents: true,
    weather: true,
    sunriseSunset: true,
  };

  const theme = remotePayload?.theme || {
    primaryColor: '#cfaf1f',
    textColor: '#f0f0f0',
    accentColor: '#ffd54f',
  };

  const communityEvents = useMemo(
    () => remotePayload?.communityEvents || [],
    [remotePayload],
  );

  const announcementItems = useMemo(
    () => buildAnnouncementItems({
      holidays: remotePayload?.upcomingHolidays || [],
      chabadDates: remotePayload?.chabadDates || [],
      communityEvents,
      boardFeatures,
    }),
    [remotePayload, communityEvents, boardFeatures],
  );

  const pushWidgetSnapshot = useCallback((nextSettings = settings, nextLang = lang) => {
    const normalized = normalizeSettings(nextSettings);
    const parsed = parseServerSettings(normalized.serverUrl, normalized.slug);
    const location = remotePayload?.location;
    const snapshotCoords = location?.lat != null && location?.long != null
      ? { lat: Number(location.lat), long: Number(location.long) }
      : coords;
    const snapshotTimezone = location?.timezone || timezone;

    syncWidgetSnapshot({
      serverUrl: parsed.serverUrl,
      slug: parsed.slug,
      language: nextLang,
      lat: snapshotCoords.lat,
      lng: snapshotCoords.long,
      timezone: snapshotTimezone,
      announcementsJson: buildWidgetAnnouncementsJson(announcementItems, nextLang),
      weatherJson: buildWidgetWeatherJson(weatherForecast, nextLang),
    });
  }, [settings, lang, remotePayload, coords, timezone, announcementItems, weatherForecast]);

  useEffect(() => {
    if (loading) {
      return;
    }

    pushWidgetSnapshot();
  }, [loading, pushWidgetSnapshot]);

  const handleSaveSettings = async (nextSettings) => {
    const normalized = normalizeSettings(nextSettings);
    await saveSettings(normalized);
    setSettings(normalized);
    pushWidgetSnapshot(normalized, normalized.language || 'ru');
    setScreen('home');
    setLoading(true);
    await refreshLocation(normalized);
    await refreshRemote(normalized, { initial: true });
    setLoading(false);
  };

  if (screen === 'settings') {
    return (
      <SettingsScreen
        settings={settings}
        lang={lang}
        onSave={handleSaveSettings}
        onPreview={(previewSettings) => pushWidgetSnapshot(previewSettings, previewSettings.language || 'ru')}
        onBack={() => setScreen('home')}
      />
    );
  }

  return (
    <div
      className={`sidebar-app${lang === 'he' ? ' is-rtl' : ''}`}
      style={{
        '--primary-color': theme.primaryColor,
        '--text-color': theme.textColor,
        '--accent-color': theme.accentColor,
      }}
    >
      <button type="button" className="settings-fab" onClick={() => setScreen('settings')} aria-label={t(lang, 'settings')}>
        ⚙
      </button>

      <div className="wooden-panel">
        <div className="inner">
          <div className="board-right-header">
            {boardFeatures.officialLogo && (
              <div className="board-official-logo-wrap">
                <img
                  className="board-official-logo"
                  src="/kaddish-official-logo.svg"
                  alt=""
                  aria-hidden="true"
                />
              </div>
            )}

            <div className="board-clock-block">
              <time>
                <h1><LiveClock timezone={effectiveTimezone} /></h1>
                <h2>{formatHebrewDate(hebrewDate, lang)}</h2>
                <h3>{formatGregorianDate(gregorianDate, lang)}</h3>
              </time>
            </div>

            {(remotePayload?.shabbatTimesEnabled !== false) && (
              <ShabbatBlock
                lat={effectiveCoords.lat}
                long={effectiveCoords.long}
                timezone={effectiveTimezone}
                hebrewDate={hebrewDate}
                lang={lang}
              />
            )}

            <WeatherBlock
              lat={effectiveCoords.lat}
              long={effectiveCoords.long}
              lang={lang}
              serverUrl={normalizeServerUrl(settings.serverUrl)}
              slug={settings.slug}
              showWeather={boardFeatures.weather !== false}
              showSunTimes={boardFeatures.sunriseSunset !== false}
              onForecastChange={handleForecastChange}
            />
          </div>

          <div className="right-panel-scroll">
            {loading && <p className="status-line">{t(lang, 'loading')}</p>}
            {!loading && refreshing && <p className="status-line">{t(lang, 'refreshing')}</p>}
            {error && <p className="status-line status-line-error">{error}</p>}
            <ScrollingAnnouncements
              items={announcementItems}
              lang={lang}
              title={t(lang, 'sidebar_upcoming_title')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
