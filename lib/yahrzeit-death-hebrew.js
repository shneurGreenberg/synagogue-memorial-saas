const Hebcal = require('hebcal');

const DEATH_HEBREW = new Map();
const DATE_HEBREW = new Map();

function deathCacheKey(death) {
  if (!death || !death.year || !death.month || !death.date) {
    return '';
  }
  return `${death.year}-${death.month}-${death.date}`;
}

function dateCacheKey(date) {
  if (!date) return '';
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function getCachedDeathHebrew(death) {
  const key = deathCacheKey(death);
  if (!key) return null;
  if (!DEATH_HEBREW.has(key)) {
    const gregorian = new Date(death.year, death.month - 1, death.date);
    DEATH_HEBREW.set(key, new Hebcal.HDate(gregorian));
  }
  return DEATH_HEBREW.get(key);
}

function getCachedDateHebrew(date) {
  const key = dateCacheKey(date);
  if (!key) return null;
  if (!DATE_HEBREW.has(key)) {
    DATE_HEBREW.set(key, new Hebcal.HDate(date));
  }
  return DATE_HEBREW.get(key);
}

function clearYahrzeitDeathHebrewCache() {
  DEATH_HEBREW.clear();
  DATE_HEBREW.clear();
}

module.exports = {
  getCachedDeathHebrew,
  getCachedDateHebrew,
  clearYahrzeitDeathHebrewCache,
  _deathHebrewForTests: DEATH_HEBREW,
};
