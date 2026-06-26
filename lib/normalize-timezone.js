const { find: findTimezone } = require('geo-tz');

const DEFAULT_TIMEZONE = 'Asia/Novosibirsk';

const CITY_TIMEZONE_ALIASES = {
  tomsk: 'Asia/Tomsk',
  novosibirsk: 'Asia/Novosibirsk',
  moscow: 'Europe/Moscow',
  jerusalem: 'Asia/Jerusalem',
  'tel aviv': 'Asia/Jerusalem',
  томск: 'Asia/Tomsk',
  תומסק: 'Asia/Tomsk',
  новосибирск: 'Asia/Novosibirsk',
  נובוסיבירסק: 'Asia/Novosibirsk',
  москва: 'Europe/Moscow',
  מוסקבה: 'Europe/Moscow',
  ירושלים: 'Asia/Jerusalem',
  'תל אביב': 'Asia/Jerusalem',
  'תל-אביב': 'Asia/Jerusalem',
};

function isValidIanaTimezone(timezone) {
  const value = String(timezone || '').trim();
  if (!value) {
    return false;
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function timezoneFromCoordinates(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const zones = findTimezone(lat, lng);
  const candidate = zones && zones[0];
  return isValidIanaTimezone(candidate) ? candidate : null;
}

function resolveTimezone(timezone, lat, lng) {
  const raw = String(timezone || '').trim();
  const alias = CITY_TIMEZONE_ALIASES[raw.toLowerCase()];

  if (alias && isValidIanaTimezone(alias)) {
    return alias;
  }

  if (isValidIanaTimezone(raw)) {
    return raw;
  }

  const fromCoords = timezoneFromCoordinates(lat, lng);
  if (fromCoords) {
    return fromCoords;
  }

  return DEFAULT_TIMEZONE;
}

module.exports = {
  DEFAULT_TIMEZONE,
  isValidIanaTimezone,
  resolveTimezone,
  timezoneFromCoordinates,
};
