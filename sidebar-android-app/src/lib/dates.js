import Hebcal from 'hebcal';

const HEBREW_MONTHS = {
  ru: ['', 'Нисана', 'Ияра', 'Сивана', 'Тамуза', 'Ава', 'Элула', 'Тишрея', 'Хешвана', 'Кислева', 'Тевета', 'Швата', 'Адара', 'Адара Бет'],
  en: ['', 'Nisan', 'Iyar', 'Sivan', 'Tamuz', 'Av', 'Elul', 'Tishrei', 'Cheshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar', 'Adar II'],
  he: ['', 'ניסן', 'אייר', 'סיוון', 'תמוז', 'אב', 'אלול', 'תשרי', 'חשוון', 'כסלו', 'טבת', 'שבט', 'אדר', 'אדר ב'],
};

const GREGORIAN_MONTHS = {
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  he: ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'],
};

export function getDatesInTimezone(timezone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const read = (type) => Number(parts.find((part) => part.type === type)?.value || 0);
  const year = read('year');
  const month = read('month');
  const day = read('day');
  const gregorianDate = new Date(year, month - 1, day);
  const hebrewDate = new Hebcal.HDate(gregorianDate);

  return { gregorianDate, hebrewDate };
}

export function formatHebrewDate(hebrewDate, lang = 'ru') {
  const months = HEBREW_MONTHS[lang] || HEBREW_MONTHS.ru;
  return `${hebrewDate.getDate()} ${months[hebrewDate.getMonth()]} ${hebrewDate.getFullYear()}`;
}

export function formatGregorianDate(gregorianDate, lang = 'ru') {
  const months = GREGORIAN_MONTHS[lang] || GREGORIAN_MONTHS.ru;
  return `${gregorianDate.getDate()} ${months[gregorianDate.getMonth()]} ${gregorianDate.getFullYear()}`;
}

export function formatEventGregorianDate(eventDate, lang = 'ru') {
  if (!eventDate?.month || !eventDate?.date) {
    return '';
  }

  const year = eventDate.year || new Date().getFullYear();
  const date = new Date(year, eventDate.month - 1, eventDate.date);
  return formatGregorianDate(date, lang);
}

export function formatEventHebrewDate(eventDate) {
  if (!eventDate?.month || !eventDate?.date) {
    return '';
  }

  const year = eventDate.year || new Date().getFullYear();
  const date = new Date(year, eventDate.month - 1, eventDate.date);
  return formatHebrewDate(new Hebcal.HDate(date), 'he');
}

export function formatClockTime(timezone) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).format(new Date());
}
