import { resolveBoardTimezone } from './timezone';

const HEBCAL_API = 'https://www.hebcal.com/shabbat?cfg=json';

const DEFAULT_TIMEZONE = 'Asia/Novosibirsk';
const DEFAULT_LAT = 54.9833;
const DEFAULT_LNG = 82.8964;

const CITY_COORDINATES = {
  tomsk: { lat: 56.4977, lng: 84.9744 },
  novosibirsk: { lat: 54.9833, lng: 82.8964 },
  moscow: { lat: 55.7558, lng: 37.6173 },
  jerusalem: { lat: 31.7683, lng: 35.2137 },
  'tel aviv': { lat: 32.0853, lng: 34.7818 },
};

function isDefaultCoordinates(lat, lng) {
  return Math.abs(lat - DEFAULT_LAT) < 0.0001 && Math.abs(lng - DEFAULT_LNG) < 0.0001;
}

function coordinatesFromCity(city) {
  const key = String(city || '').trim().toLowerCase();
  return CITY_COORDINATES[key] || null;
}

export function getBoardTimezone(data) {
  return resolveBoardTimezone(data);
}

export function getBoardLocation(data) {
  const loc = (data && data.location) || {};
  let lat = Number(loc.lat);
  let lng = Number(loc.long);

  if (!Number.isFinite(lat)) {
    lat = DEFAULT_LAT;
  }
  if (!Number.isFinite(lng)) {
    lng = DEFAULT_LNG;
  }

  const cityCoords = coordinatesFromCity(loc.city);
  if (cityCoords && isDefaultCoordinates(lat, lng)) {
    lat = cityCoords.lat;
    lng = cityCoords.lng;
  }

  return {
    lat,
    lng,
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

async function fetchShabbatTimesForDate(location, now) {
  let items = await fetchHebcalItems(location, now);
  let times = parseHebcalItems(items, now);
  if (times) {
    return times;
  }

  const retryOffsets = [24, 48, 72, 96, 120, 144, 168];
  for (const hours of retryOffsets) {
    const retryAt = new Date(now.getTime() + hours * 60 * 60 * 1000);
    items = await fetchHebcalItems(location, retryAt);
    times = parseHebcalItems(items, now);
    if (times) {
      return times;
    }
  }

  return null;
}

export async function fetchShabbatTimes(data, now = new Date()) {
  const location = getBoardLocation(data);

  try {
    return await fetchShabbatTimesForDate(location, now);
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
