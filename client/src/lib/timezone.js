const DEFAULT_TIMEZONE = 'Asia/Novosibirsk';

const CITY_TIMEZONE_ALIASES = {
  tomsk: 'Asia/Tomsk',
  novosibirsk: 'Asia/Novosibirsk',
  moscow: 'Europe/Moscow',
  jerusalem: 'Asia/Jerusalem',
  'tel aviv': 'Asia/Jerusalem',
};

export function isValidIanaTimezone(timezone) {
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

export function resolveBoardTimezone(data) {
  const raw = data && data.location && data.location.timezone;
  const alias = raw && CITY_TIMEZONE_ALIASES[String(raw).trim().toLowerCase()];

  if (alias && isValidIanaTimezone(alias)) {
    return alias;
  }

  if (isValidIanaTimezone(raw)) {
    return raw;
  }

  return DEFAULT_TIMEZONE;
}
