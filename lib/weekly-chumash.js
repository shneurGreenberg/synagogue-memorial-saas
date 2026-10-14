const Hebcal = require('hebcal');
const { getDatePartsInTimezone } = require('./yahrzeit');
const { HOLIDAYS, PARSHA, translateLearningLine } = require('./jewish-translations');

const ALIYAH_EN = ['Rishon', 'Sheni', 'Shlishi', "Revi'i", 'Chamishi', 'Shishi', 'Shvii'];

const WEEKDAY_SHORT = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getWeekdayIndexInTimezone(timezone, now = new Date()) {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).format(now);

  return WEEKDAY_SHORT[weekday];
}

function addDaysToGregorianParts({ year, month, day }, delta) {
  const shifted = new Date(year, month - 1, day + delta);
  return {
    year: shifted.getFullYear(),
    month: shifted.getMonth() + 1,
    day: shifted.getDate(),
  };
}

function partsToLocalDate({ year, month, day }) {
  return new Date(year, month - 1, day);
}

function isTorahParshaName(name) {
  if (!name || HOLIDAYS[name]) {
    return false;
  }

  if (PARSHA[name]) {
    return true;
  }

  const lower = String(name).toLowerCase();
  return Object.keys(PARSHA).some((key) => key.toLowerCase() === lower);
}

function getShabbatParshaNameDiaspora(shabbatGregorianDate) {
  const hdate = new Hebcal.HDate(shabbatGregorianDate);
  const parshiot = typeof hdate.getParsha === 'function'
    ? hdate.getParsha(false)
    : hdate.getParsha();

  if (!parshiot || !parshiot.length) {
    return '';
  }

  const primary = parshiot[0];
  return isTorahParshaName(primary) ? primary : '';
}

function computeDailyChumashEnglishLabel(timezone, now = new Date()) {
  const todayParts = getDatePartsInTimezone(timezone, now);
  const weekday = getWeekdayIndexInTimezone(timezone, now);

  if (weekday === undefined) {
    return '';
  }

  const shabbatParts = addDaysToGregorianParts(todayParts, 6 - weekday);
  const parsha = getShabbatParshaNameDiaspora(partsToLocalDate(shabbatParts));
  if (!parsha) {
    return '';
  }

  const aliyah = ALIYAH_EN[weekday];
  return `${parsha}, ${aliyah}`;
}

function resolveComputedDailyChumashLabel(timezone, now = new Date(), lang = 'en') {
  const english = computeDailyChumashEnglishLabel(timezone, now);
  if (!english) {
    return '';
  }

  return translateLearningLine(english, lang);
}

module.exports = {
  ALIYAH_EN,
  computeDailyChumashEnglishLabel,
  resolveComputedDailyChumashLabel,
};
