const HEBCAL_API = 'https://www.hebcal.com/shabbat?cfg=json';

function getLocalDateParts(now, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const read = (type) => parts.find((part) => part.type === type)?.value || '';

  return {
    year: Number(read('year')),
    month: Number(read('month')),
    day: Number(read('day')),
  };
}

function buildHebcalUrl(lat, long, timezone, now = new Date()) {
  const { year, month, day } = getLocalDateParts(now, timezone);
  const params = new URLSearchParams({
    geo: 'pos',
    latitude: String(lat),
    longitude: String(long),
    tzid: timezone,
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

  const nowMs = now.getTime();

  for (let i = 0; i < candles.length; i += 1) {
    const enter = candles[i];
    const exit = havdalah.find((candidate) => candidate > enter);
    if (!exit) {
      continue;
    }

    if (enter.getTime() <= nowMs && nowMs < exit.getTime()) {
      return { enter, exit };
    }

    if (enter.getTime() > nowMs) {
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

export async function fetchShabbatTimes(lat, long, timezone, now = new Date()) {
  const response = await fetch(buildHebcalUrl(lat, long, timezone, now));
  if (!response.ok) {
    throw new Error(`Hebcal ${response.status}`);
  }

  const payload = await response.json();
  return parseHebcalItems(payload.items, now);
}

export function formatShabbatTime(date, timezone) {
  if (!date) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).format(new Date(date));
}
