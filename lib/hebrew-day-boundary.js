/**
 * 1.35.0 I58: on a Hebrew-calendar board the civil "day" for yahrzeit / Hayom Yom / tiles
 * rolls at sunset (Hebcal shkiah) in the community location, not at midnight.
 * Gregorian boards keep civil midnight.
 */
const Hebcal = require('hebcal');

function getDatePartsInTimezone(timezone, now = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = {};
  formatter.formatToParts(now).forEach((part) => {
    if (part.type !== 'literal') {
      parts[part.type] = part.value;
    }
  });

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function civilNoonDate(timezone, now = new Date()) {
  const parts = getDatePartsInTimezone(timezone, now);
  return new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0);
}

function sunsetForCivilDay(timezone, lat, lng, now = new Date()) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  const hdate = new Hebcal.HDate(civilNoonDate(timezone, now));
  hdate.setLocation(lat, lng);
  const z = hdate.getZemanim();
  const sunset = z && z.shkiah;
  if (!(sunset instanceof Date) || Number.isNaN(sunset.getTime())) {
    return null;
  }
  return sunset;
}

function nextSunsetAfter(timezone, lat, lng, now = new Date()) {
  const todaySunset = sunsetForCivilDay(timezone, lat, lng, now);
  if (!todaySunset) {
    return null;
  }
  if (now.getTime() < todaySunset.getTime()) {
    return todaySunset;
  }
  // Tomorrow's civil noon in the community timezone.
  const parts = getDatePartsInTimezone(timezone, now);
  const tomorrowNoon = new Date(parts.year, parts.month - 1, parts.day + 1, 12, 0, 0);
  const hdate = new Hebcal.HDate(tomorrowNoon);
  hdate.setLocation(lat, lng);
  const z = hdate.getZemanim();
  const sunset = z && z.shkiah;
  if (!(sunset instanceof Date) || Number.isNaN(sunset.getTime())) {
    return null;
  }
  return sunset;
}

function msUntilNextMidnight(timezone, now = new Date()) {
  const parts = getDatePartsInTimezone(timezone, now);
  const elapsedMs = (
    (parts.hour * 3600)
    + (parts.minute * 60)
    + parts.second
  ) * 1000;
  const remaining = (24 * 3600 * 1000) - elapsedMs;
  return Math.max(remaining + 1000, 5000);
}

/**
 * @param {object} options
 * @param {'hebrew'|'gregorian'} [options.calendar]
 * @param {number} [options.lat]
 * @param {number} [options.lng]
 */
function msUntilNextDayBoundary(timezone, now = new Date(), options = {}) {
  if (options.calendar === 'hebrew') {
    const sunset = nextSunsetAfter(timezone, options.lat, options.lng, now);
    if (sunset) {
      return Math.max(sunset.getTime() - now.getTime() + 1000, 5000);
    }
  }
  return msUntilNextMidnight(timezone, now);
}

function getGregorianDateInTimezone(timezone, now = new Date()) {
  const parts = getDatePartsInTimezone(timezone, now);
  return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

/**
 * Hebrew date for "today" on the board. When calendar=hebrew and lat/lng are set,
 * after local sunset the date advances to the next Hebrew day.
 */
function getHebrewDateInTimezone(timezone, now = new Date(), options = {}) {
  const gregorian = getGregorianDateInTimezone(timezone, now);
  let hdate = new Hebcal.HDate(gregorian);
  if (options.calendar === 'hebrew' && Number.isFinite(options.lat) && Number.isFinite(options.lng)) {
    hdate.setLocation(options.lat, options.lng);
    const z = hdate.getZemanim();
    const sunset = z && z.shkiah;
    if (sunset instanceof Date && !Number.isNaN(sunset.getTime()) && now.getTime() >= sunset.getTime()) {
      hdate = hdate.next();
    }
  }
  return hdate;
}

function getCivilDayKeyInTimezone(timezone, now = new Date()) {
  const parts = getDatePartsInTimezone(timezone, now);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

/**
 * Stable key that changes exactly when the board's calendar day rolls.
 * Hebrew boards: Hebrew Y-M-D (rolls at sunset). Gregorian: civil Y-M-D (midnight).
 */
function getCalendarDayKey(timezone, now = new Date(), options = {}) {
  if (options.calendar === 'hebrew') {
    const h = getHebrewDateInTimezone(timezone, now, options);
    return `he-${h.getFullYear()}-${h.getMonth()}-${h.getDate()}`;
  }
  return getCivilDayKeyInTimezone(timezone, now);
}

module.exports = {
  getDatePartsInTimezone,
  getGregorianDateInTimezone,
  getHebrewDateInTimezone,
  getCivilDayKeyInTimezone,
  getCalendarDayKey,
  msUntilNextMidnight,
  msUntilNextDayBoundary,
  sunsetForCivilDay,
  nextSunsetAfter,
};
