const { resolveTimezone, timezoneFromCoordinates } = require('./normalize-timezone');

const DEFAULT_LAT = 54.9833;
const DEFAULT_LNG = 82.8964;

const CITY_COORDINATES = {
  tomsk: { lat: 56.4977, lng: 84.9744 },
  novosibirsk: { lat: 54.9833, lng: 82.8964 },
  moscow: { lat: 55.7558, lng: 37.6173 },
  jerusalem: { lat: 31.7683, lng: 35.2137 },
  'tel aviv': { lat: 32.0853, lng: 34.7818 },
};

const CITY_NAME_ALIASES = {
  томск: 'tomsk',
  תומסק: 'tomsk',
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
  return CITY_NAME_ALIASES[key] || key;
}

function coordinatesFromCity(city) {
  const key = normalizeCityKey(city);
  return CITY_COORDINATES[key] || null;
}

function isDefaultCoordinates(lat, lng) {
  return Math.abs(lat - DEFAULT_LAT) < 0.0001 && Math.abs(lng - DEFAULT_LNG) < 0.0001;
}

function normalizeSynagogueLocation(location) {
  const source = location || {};
  let lat = Number(source.lat);
  let lng = Number(source.long);
  const city = String(source.city || '').trim();

  if (!Number.isFinite(lat)) {
    lat = DEFAULT_LAT;
  }
  if (!Number.isFinite(lng)) {
    lng = DEFAULT_LNG;
  }

  const cityCoords = coordinatesFromCity(city);
  if (cityCoords && (normalizeCityKey(city) in CITY_COORDINATES || isDefaultCoordinates(lat, lng))) {
    lat = cityCoords.lat;
    lng = cityCoords.lng;
  }

  const timezone = resolveTimezone(source.timezone, lat, lng);

  return {
    lat,
    long: lng,
    city: city || 'Community',
    timezone,
  };
}

module.exports = {
  normalizeSynagogueLocation,
  coordinatesFromCity,
  timezoneFromCoordinates,
};
