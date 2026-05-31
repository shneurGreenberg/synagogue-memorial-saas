const HEBCAL_API = 'https://www.hebcal.com/shabbat?cfg=json';

const DEFAULT_TIMEZONE = 'Asia/Novosibirsk';
const DEFAULT_LAT = 54.9833;
const DEFAULT_LNG = 82.8964;

export function getBoardTimezone(data) {
  return (data && data.location && data.location.timezone) || DEFAULT_TIMEZONE;
}

export function getBoardLocation(data) {
  const loc = (data && data.location) || {};
  return {
    lat: Number.isFinite(Number(loc.lat)) ? Number(loc.lat) : DEFAULT_LAT,
    lng: Number.isFinite(Number(loc.long)) ? Number(loc.long) : DEFAULT_LNG,
    timezone: getBoardTimezone(data),
  };
}

function buildHebcalUrl(location) {
  const params = new URLSearchParams({
    geo: 'pos',
    latitude: String(location.lat),
    longitude: String(location.lng),
    tzid: location.timezone,
    M: 'on',
    b: '18',
  });
  return `${HEBCAL_API}&${params.toString()}`;
}

function parseHebcalItems(items, now = new Date()) {
  let enter = null;
  let exit = null;

  for (const item of items || []) {
    if (item.category === 'candles' && item.date) {
      enter = new Date(item.date);
    }
    if (item.category === 'havdalah' && item.date) {
      exit = new Date(item.date);
    }
  }

  if (!enter || !exit) {
    return null;
  }

  if (exit <= now) {
    return null;
  }

  return { enter, exit };
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
