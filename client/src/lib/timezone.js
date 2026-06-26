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

const CITY_ALIAS_TO_CANONICAL = {
  томск: 'tomsk',
  תומסק: 'tomsk',
  'tomsk, russia': 'tomsk',
  новосибирск: 'novosibirsk',
  נובוסיבירסק: 'novosibirsk',
  москва: 'moscow',
  מוסקבה: 'moscow',
  ירושלים: 'jerusalem',
  'תל אביב': 'tel aviv',
  'תל-אביב': 'tel aviv',
};

const CITY_CANONICAL_KEYS = Object.keys(CITY_TIMEZONE_ALIASES).filter((key) => !CITY_ALIAS_TO_CANONICAL[key]);

function normalizeCityKey(city) {
  const key = String(city || '').trim().toLowerCase();
  if (CITY_CANONICAL_KEYS.includes(key)) {
    return key;
  }
  if (CITY_ALIAS_TO_CANONICAL[key]) {
    return CITY_ALIAS_TO_CANONICAL[key];
  }

  for (const [alias, canonical] of Object.entries(CITY_ALIAS_TO_CANONICAL)) {
    if (key.includes(alias)) {
      return canonical;
    }
  }

  for (const canonical of CITY_CANONICAL_KEYS) {
    if (key.includes(canonical)) {
      return canonical;
    }
  }

  return key;
}

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

  const cityKey = normalizeCityKey(loc.city || '');
  const cityAlias = CITY_TIMEZONE_ALIASES[cityKey];
  if (cityAlias && isValidIanaTimezone(cityAlias)) {
    return cityAlias;
  }

  return DEFAULT_TIMEZONE;
}
