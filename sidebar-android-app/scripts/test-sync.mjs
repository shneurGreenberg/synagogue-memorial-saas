import { buildSidebarApiUrl, normalizeSettings, parseServerSettings } from '../src/lib/settings.js';
import { fetchSidebarPayload, loadCachedSidebarPayload } from '../src/lib/sync.js';
import { fetchOfflineJewishFeed } from '../src/lib/offline-feed.js';
import { buildAnnouncementItems } from '../src/lib/announcements.js';

const settings = normalizeSettings({
  serverUrl: 'https://synagogue-kadish-shneur.amvera.io',
  slug: 'novosibirsk',
  language: 'ru',
});

console.log('URL ru:', buildSidebarApiUrl(settings, 'ru'));

const payload = await fetchSidebarPayload(settings, 'ru');
console.log('Payload holidays:', payload?.upcomingHolidays?.length);
console.log('First holiday:', payload?.upcomingHolidays?.[0]?.title);
console.log('Community events:', payload?.communityEvents?.length);

const items = buildAnnouncementItems({
  holidays: payload?.upcomingHolidays || [],
  chabadDates: payload?.chabadDates || [],
  communityEvents: payload?.communityEvents || [],
  boardFeatures: payload?.boardFeatures || {},
});
console.log('Announcement items:', items.length);
console.log('First item:', items[0]?.title);

const settingsHe = { ...settings, language: 'he' };
const payloadHe = await fetchSidebarPayload(settingsHe, 'he');
const itemsHe = buildAnnouncementItems({
  holidays: payloadHe?.upcomingHolidays || [],
  chabadDates: payloadHe?.chabadDates || [],
  communityEvents: [],
});
console.log('Hebrew first:', itemsHe[0]?.title);

const offline = await fetchOfflineJewishFeed('ru');
console.log('Offline holidays:', offline.upcomingHolidays.length);
