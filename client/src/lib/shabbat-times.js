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

const CITY_GEONAME_IDS = {
  tomsk: '1489425',
  novosibirsk: '1496747',
  moscow: '524901',
  jerusalem: '281184',
  'tel aviv': '293397',
};

const CITY_NAME_ALIASES = {
  томск: 'tomsk',
  תומסק: 'tomsk',
  'tomsk, russia': 'tomsk',
  'томск, россия': 'tomsk',
  новосибирск: 'novosibirsk',
  נובוסיבירסק: 'novosibirsk',
  москва: 'moscow',
  מוסקבה: 'moscow',
  ירושלים: 'jerusalem',
  'תל אביב': 'tel aviv',
  'תל-אביב': 'tel aviv',
};

function normalizeCityKey(city) {
  const key = String(city || '').trim().toLowerCase();
  if (CITY_NAME_ALIASES[key]) {
    return CITY_NAME_ALIASES[key];
  }
  if (CITY_COORDINATES[key]) {
    return key;
  }

  for (const [alias, canonical] of Object.entries(CITY_NAME_ALIASES)) {
    if (key.includes(alias)) {
      return canonical;
    }
  }

  for (const canonical of Object.keys(CITY_COORDINATES)) {
    if (key.includes(canonical)) {
      return canonical;
    }
  }

  return key;
}

function coordinatesFromCity(city) {
  const key = normalizeCityKey(city);
  return CITY_COORDINATES[key] || null;
}

function geonameIdFromCity(city) {
  const key = normalizeCityKey(city);
  return CITY_GEONAME_IDS[key] || null;
}

function isDefaultCoordinates(lat, lng) {
  return Math.abs(lat - DEFAULT_LAT) < 0.0001 && Math.abs(lng - DEFAULT_LNG) < 0.0001;
}

export function getBoardTimezone(data) {
  return resolveBoardTimezone(data);
}

export function getBoardLocation(data) {
  const loc = (data && data.location) || {};
  const city = String(loc.city || '').trim();
  const cityKey = normalizeCityKey(city);
  const cityCoords = coordinatesFromCity(city);
  const geonameId = geonameIdFromCity(city);
  let lat = Number(loc.lat);
  let lng = Number(loc.long);

  if (!Number.isFinite(lat)) {
    lat = DEFAULT_LAT;
  }
  if (!Number.isFinite(lng)) {
    lng = DEFAULT_LNG;
  }

  if (cityCoords && (geonameId || cityKey in CITY_COORDINATES || isDefaultCoordinates(lat, lng))) {
    lat = cityCoords.lat;
    lng = cityCoords.lng;
  }

  return {
    lat,
    lng,
    city,
    geonameId,
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

  if (location.geonameId) {
    const params = new URLSearchParams({
      geonameid: location.geonameId,
      M: 'on',
      gy: String(year),
      gm: String(month),
      gd: String(day),
    });
    return `${HEBCAL_API}&${params.toString()}`;
  }

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

function isHolidayMemo(memo) {
  if (!memo) {
    return false;
  }

  const holidayKeywords = [
    'Rosh Hashana',
    'Yom Kippur',
    'Sukkot',
    'Pesach',
    'Shavuot',
    'Shmini Atzeret',
    'Simchat Torah',
    'Chanukah',
    'Purim',
    'Shemini Atzeret',
  ];

  return holidayKeywords.some((keyword) => memo.includes(keyword));
}

function parseHebcalItems(items, now = new Date()) {
  const candlesData = [];
  const havdalahData = [];

  for (const item of items || []) {
    if (item.category === 'candles' && item.date) {
      candlesData.push({
        date: new Date(item.date),
        memo: item.memo || '',
        hebrew: item.hebrew || '',
      });
    }
    if (item.category === 'havdalah' && item.date) {
      havdalahData.push({
        date: new Date(item.date),
        memo: item.memo || '',
        hebrew: item.hebrew || '',
      });
    }
  }

  candlesData.sort((a, b) => a.date - b.date);
  havdalahData.sort((a, b) => a.date - b.date);

  const nowMs = now.getTime();

  for (let i = 0; i < candlesData.length; i += 1) {
    const enterData = candlesData[i];
    const exitData = havdalahData.find((candidate) => candidate.date > enterData.date);
    if (!exitData) {
      continue;
    }

    const enterMs = enterData.date.getTime();
    const exitMs = exitData.date.getTime();

    if (enterMs <= nowMs && nowMs < exitMs) {
      return {
        enter: enterData.date,
        exit: exitData.date,
        isHoliday: isHolidayMemo(enterData.memo) || isHolidayMemo(exitData.memo),
        memo: enterData.memo || exitData.memo,
      };
    }

    if (enterMs > nowMs) {
      return {
        enter: enterData.date,
        exit: exitData.date,
        isHoliday: isHolidayMemo(enterData.memo) || isHolidayMemo(exitData.memo),
        memo: enterData.memo || exitData.memo,
      };
    }
  }

  const lastEnterData = candlesData[candlesData.length - 1];
  const lastExitData = havdalahData[havdalahData.length - 1];
  if (lastEnterData && lastExitData && lastExitData.date > lastEnterData.date) {
    return {
      enter: lastEnterData.date,
      exit: lastExitData.date,
      isHoliday: isHolidayMemo(lastEnterData.memo) || isHolidayMemo(lastExitData.memo),
      memo: lastEnterData.memo || lastExitData.memo,
    };
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
