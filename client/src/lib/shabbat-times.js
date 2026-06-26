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

function formatHebcalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildHebcalUrl(location, now = new Date()) {
  const start = new Date(now);
  start.setDate(start.getDate() - 1);
  const end = new Date(now);
  end.setDate(end.getDate() + 14);

  const params = new URLSearchParams({
    geo: 'pos',
    latitude: String(location.lat),
    longitude: String(location.lng),
    tzid: location.timezone,
    M: 'on',
    b: '18',
    start: formatHebcalDate(start),
    end: formatHebcalDate(end),
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

  for (const exit of havdalah) {
    if (exit <= now) {
      continue;
    }
    const enter = candles.filter((candidate) => candidate < exit).pop();
    if (enter) {
      return { enter, exit };
    }
  }

  const nextEnter = candles.find((candidate) => candidate > now);
  if (nextEnter) {
    const nextExit = havdalah.find((candidate) => candidate > nextEnter);
    if (nextExit) {
      return { enter: nextEnter, exit: nextExit };
    }
  }

  return null;
}

export async function fetchShabbatTimes(data, now = new Date()) {
  const location = getBoardLocation(data);
  const url = buildHebcalUrl(location);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Hebcal API ${response.status}`);
    }
    const payload = await response.json();
    return parseHebcalItems(payload.items, now);
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
