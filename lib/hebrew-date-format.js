const Hebcal = require('hebcal');
const gematriya = require('gematriya');

const HEBREW_MONTHS = ['', 'ניסן', 'אייר', 'סיוון', 'תמוז', 'אב', 'אלול', 'תשרי', 'חשוון', 'כסלו', 'טבת', 'שבט', 'אדר', 'אדר ב'];

const ENGLISH_MONTHS = ['', 'Nisan', 'Iyar', 'Sivan', 'Tamuz', 'Av', 'Elul', 'Tishrei', 'Cheshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar', 'Adar II'];

const RUSSIAN_MONTHS = {
  1: 'Нисана',
  2: 'Ияра',
  3: 'Сивана',
  4: 'Тамуза',
  5: 'Ава',
  6: 'Элула',
  7: 'Тишрея',
  8: 'Хешвана',
  9: 'Кислева',
  10: 'Тевета',
  11: 'Швата',
  12: 'Адара',
  13: 'Адара Бет',
};

function gematriaDay(day) {
  return gematriya(day);
}

function gematriaHebrewYear(year) {
  const remainder = year % 1000;
  return gematriya(remainder, 3);
}

function formatHebrewDate(hdate, lang = 'ru') {
  if (!hdate || typeof hdate.getDate !== 'function') {
    return '';
  }

  const monthIndex = hdate.getMonth();
  const month = HEBREW_MONTHS[monthIndex] || '';

  if (lang === 'he') {
    const day = gematriaDay(hdate.getDate());
    const year = gematriaHebrewYear(hdate.getFullYear());
    return `${day} ${month} ${year}`.trim();
  }

  if (lang === 'en') {
    return `${hdate.getDate()} ${ENGLISH_MONTHS[monthIndex] || ''} ${hdate.getFullYear()}`.trim();
  }

  const ruMonth = RUSSIAN_MONTHS[monthIndex] || '';
  return `${hdate.getDate()} ${ruMonth} ${hdate.getFullYear()}`.trim();
}

function formatGregorianAsHebrewDate(gregorianDate, lang = 'ru') {
  if (!gregorianDate || typeof gregorianDate.getDate !== 'function') {
    return '';
  }

  return formatHebrewDate(new Hebcal.HDate(gregorianDate), lang);
}

function formatIsoDateAsHebrewDate(isoDate, lang = 'ru') {
  if (!isoDate) {
    return '';
  }

  const [year, month, day] = String(isoDate).split('-').map(Number);
  if (!year || !month || !day) {
    return '';
  }

  return formatGregorianAsHebrewDate(new Date(year, month - 1, day), lang);
}

module.exports = {
  HEBREW_MONTHS,
  formatHebrewDate,
  formatGregorianAsHebrewDate,
  formatIsoDateAsHebrewDate,
  gematriaDay,
  gematriaHebrewYear,
};
