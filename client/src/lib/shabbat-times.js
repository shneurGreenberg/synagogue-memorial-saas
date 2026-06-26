import { resolveBoardTimezone } from './timezone';

const HEBCAL_API = 'https://www.hebcal.com/shabbat?cfg=json';

const DEFAULT_TIMEZONE = 'Asia/Novosibirsk';
const DEFAULT_LAT = 54.9833;
const DEFAULT_LNG = 82.8964;

export function getBoardTimezone(data) {
  return resolveBoardTimezone(data);
}

export function getBoardLocation(data) {
  const loc = (data && data.location) || {};
  return {
    lat: Number.isFinite(Number(loc.lat)) ? Number(loc.lat) : DEFAULT_LAT,
    lng: Number.isFinite(Number(loc.long)) ? Number(loc.long) : DEFAULT_LNG,
    timezone: getBoardTimezone(data),
  };
}

function getLocalDateParts(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const read = (type) => parts.find((part) => part.type === type)?.value || '';

  return {
    year: Number(read('year')),
    month: Number(read('month')),
    day: Number(read('day')),
  };
}

function buildHebcalUrl(location, now = new Date()) {
  const { year, month, day } = getLocalDateParts(now, location.timezone);

  const params = new URLSearchParams({
    geo: 'pos',
    latitude: String(location.lat),
    longitude: String(location.lng),
    tzid: location.timezone,
    M: 'on',
    b: '18',
    gy: String(year),
    gm: String(month),
    gd: String(day),
  });
  return `${HEBCAL_API}&${params.toString()}`;
}

function parseHebcalItems(items, now = new Date()) {
  const candles = [];
  const havdalah = [];

  for (const item of items || []) {
    if (item.category === 'candles' && item.date) {
      candles.push(new Date(item.date));
    }
    if (item.category === 'havdalah' && item.date) {
      havdalah.push(new Date(item.date));
    }
  }

  candles.sort((a, b) => a - b);
  havdalah.sort((a, b) => a - b);

  for (const enter of candles) {
    const exit = havdalah.find((candidate) => candidate > enter);
    if (!exit) {
      continue;
    }
    if (exit > now) {
      return { enter, exit };
    }
  }

  const lastEnter = candles[candles.length - 1];
  const lastExit = havdalah[havdalah.length - 1];
  if (lastEnter && lastExit && lastExit > lastEnter) {
    return { enter: lastEnter, exit: lastExit };
  }

  return null;
}

async function fetchHebcalItems(location, now = new Date()) {
  const response = await fetch(buildHebcalUrl(location, now));
  if (!response.ok) {
    throw new Error(`Hebcal API ${response.status}`);
  }
  const payload = await response.json();
  return payload.items || [];
}

export async function fetchShabbatTimes(data, now = new Date()) {
  const location = getBoardLocation(data);

  try {
    let items = await fetchHebcalItems(location, now);
    let times = parseHebcalItems(items, now);

    if (!times) {
      const retryAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      items = await fetchHebcalItems(location, retryAt);
      times = parseHebcalItems(items, now);
    }

    return times;
  } catch (err) {
    console.error('Shabbat times fetch failed:', err);
    return null;
  }
}

export function formatShabbatClockTime(date, timezone = DEFAULT_TIMEZONE) {
  if (!date) {
    return '—';
  }

  const value = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).format(value);
}

export function msUntilNextRefresh(times, now = new Date()) {
  if (!times) {
    return 60 * 60 * 1000;
  }

  const boundaries = [times.enter, times.exit].filter(Boolean);
  const upcoming = boundaries
    .map((date) => new Date(date).getTime() - now.getTime())
    .filter((ms) => ms > 0);

  if (upcoming.length === 0) {
    return 60 * 1000;
  }

  return Math.min(...upcoming, 6 * 60 * 60 * 1000);
}
