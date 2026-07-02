import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LiveClock } from './components/LiveClock';
import { ShabbatBlock } from './components/ShabbatBlock';
import { WeatherBlock } from './components/WeatherBlock';
import { ScrollingAnnouncements } from './components/ScrollingAnnouncements';
import { SettingsScreen } from './components/SettingsScreen';
import { AdminEventsScreen } from './components/AdminEventsScreen';
import {
  formatGregorianDate,
  formatHebrewDate,
  getDatesInTimezone,
} from './lib/dates';
import { getDeviceCoordinates, resolveTimezone } from './lib/location';
import {
  buildAnnouncementItems,
  prepareCommunityEvents,
} from './lib/announcements';
import { fetchSidebarPayload } from './lib/sync';
import {
  DEFAULT_SETTINGS,
  loadLocalEvents,
  loadSettings,
  normalizeServerUrl,
  saveLocalEvents,
  saveSettings,
} from './lib/settings';
import { t } from './lib/i18n';

const DEFAULT_COORDS = { lat: 54.9833, long: 82.8964 };
const DEFAULT_TIMEZONE = 'Asia/Novosibirsk';

function mergeLocalEvents(localEvents, lang) {
  return prepareCommunityEvents(
    localEvents.map((event) => ({
      _id: event.id,
      title: event.title,
      text: event.text,
      titles: { ru: event.title, en: event.title, he: event.title },
      texts: { ru: event.text, en: event.text, he: event.text },
      startAt: event.startAt || new Date().toISOString(),
    })),
    lang,
  );
}

export default function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [screen, setScreen] = useState('home');
  const [coords, setCoords] = useState(DEFAULT_COORDS);
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [remotePayload, setRemotePayload] = useState(null);
  const [localEvents, setLocalEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const lang = settings.language || 'ru';

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

  const refreshRemote = useCallback(async (nextSettings) => {
    try {
      const payload = await fetchSidebarPayload(nextSettings, nextSettings.language);
      setRemotePayload(payload);
      if (payload) {
        setError('');
      }
    } catch {
      setRemotePayload(null);
      if (normalizeServerUrl(nextSettings.serverUrl) && nextSettings.slug) {
        setError(t(nextSettings.language || 'ru', 'sync_error'));
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const loadedSettings = await loadSettings();
      const loadedEvents = await loadLocalEvents();
      if (cancelled) return;

      setSettings(loadedSettings);
      setLocalEvents(loadedEvents);
      await refreshLocation(loadedSettings);
      await refreshRemote(loadedSettings);
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshLocation, refreshRemote]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      refreshRemote(settings);
    }, 30000);

    return () => window.clearInterval(timer);
  }, [settings, refreshRemote]);

  const { gregorianDate, hebrewDate } = getDatesInTimezone(timezone);
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

  const communityEvents = useMemo(() => {
    const remoteEvents = remotePayload?.communityEvents || [];
    const localPrepared = mergeLocalEvents(localEvents, lang);
    return [...remoteEvents, ...localPrepared];
  }, [remotePayload, localEvents, lang]);

  const announcementItems = useMemo(
    () => buildAnnouncementItems({
      holidays: remotePayload?.upcomingHolidays || [],
      chabadDates: remotePayload?.chabadDates || [],
      communityEvents,
      boardFeatures,
    }),
    [remotePayload, communityEvents, boardFeatures],
  );

  const handleSaveSettings = async (nextSettings) => {
    await saveSettings(nextSettings);
    setSettings(nextSettings);
    setScreen('home');
    setLoading(true);
    await refreshLocation(nextSettings);
    await refreshRemote(nextSettings);
    setLoading(false);
  };

  const handleAddLocalEvent = async ({ title, text }) => {
    const next = [
      {
        id: `local-${Date.now()}`,
        title,
        text,
        startAt: new Date().toISOString(),
      },
      ...localEvents,
    ];
    setLocalEvents(next);
    await saveLocalEvents(next);
  };

  const handleDeleteLocalEvent = async (id) => {
    const next = localEvents.filter((event) => event.id !== id);
    setLocalEvents(next);
    await saveLocalEvents(next);
  };

  if (screen === 'settings') {
    return (
      <SettingsScreen
        settings={settings}
        lang={lang}
        onSave={handleSaveSettings}
        onBack={() => setScreen('home')}
        onOpenAdmin={() => setScreen('admin')}
      />
    );
  }

  if (screen === 'admin') {
    return (
      <AdminEventsScreen
        events={localEvents}
        lang={lang}
        onAdd={handleAddLocalEvent}
        onDelete={handleDeleteLocalEvent}
        onBack={() => setScreen('settings')}
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
                <div className="board-official-logo-placeholder" aria-hidden="true">☪</div>
              </div>
            )}

            <div className="board-clock-block">
              <time>
                <h1><LiveClock timezone={timezone} /></h1>
                <h2>{formatHebrewDate(hebrewDate, lang)}</h2>
                <h3>{formatGregorianDate(gregorianDate, lang)}</h3>
              </time>
            </div>

            {(remotePayload?.shabbatTimesEnabled !== false) && (
              <ShabbatBlock
                lat={coords.lat}
                long={coords.long}
                timezone={timezone}
                hebrewDate={hebrewDate}
                lang={lang}
              />
            )}

            <WeatherBlock
              lat={coords.lat}
              long={coords.long}
              lang={lang}
              serverUrl={normalizeServerUrl(settings.serverUrl)}
              slug={settings.slug}
              showWeather={boardFeatures.weather !== false}
              showSunTimes={boardFeatures.sunriseSunset !== false}
            />
          </div>

          <div className="right-panel-scroll">
            {loading && <p className="status-line">{t(lang, 'loading')}</p>}
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
