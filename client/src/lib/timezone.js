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
  const loc = (data && data.location) || {};
  const raw = loc.timezone;
  const alias = raw && CITY_TIMEZONE_ALIASES[String(raw).trim().toLowerCase()];

  if (alias && isValidIanaTimezone(alias)) {
    return alias;
  }

  if (isValidIanaTimezone(raw)) {
    return raw;
  }

  const cityKey = String(loc.city || '').trim().toLowerCase();
  const cityAlias = cityKey && CITY_TIMEZONE_ALIASES[cityKey];
  if (cityAlias && isValidIanaTimezone(cityAlias)) {
    return cityAlias;
  }

  return DEFAULT_TIMEZONE;
}
