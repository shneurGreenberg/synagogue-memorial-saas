import Hebcal from 'hebcal';
import gematriya from 'gematriya';

const HEBREW_MONTHS = ['', 'ניסן', 'אייר', 'סיוון', 'תמוז', 'אב', 'אלול', 'תשרי', 'חשוון', 'כסלו', 'טבת', 'שבט', 'אדר', 'אדר ב'];

const ENGLISH_MONTHS = ['', 'Nisan', 'Iyar', 'Sivan', 'Tamuz', 'Av', 'Elul', 'Tishrei', 'Cheshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar', 'Adar II'];

function gematriaDay(day) {
  return gematriya(day, { punctuate: true });
}

function gematriaHebrewYear(year) {
  const remainder = year % 1000;
  return gematriya(remainder, { punctuate: true });
}

export function formatHebrewDate(hdate, lang = 'ru') {
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

  switch (monthIndex) {
    case 1: return `${hdate.getDate()} Нисана ${hdate.getFullYear()}`;
    case 2: return `${hdate.getDate()} Ияра ${hdate.getFullYear()}`;
    case 3: return `${hdate.getDate()} Сивана ${hdate.getFullYear()}`;
    case 4: return `${hdate.getDate()} Тамуза ${hdate.getFullYear()}`;
    case 5: return `${hdate.getDate()} Ава ${hdate.getFullYear()}`;
    case 6: return `${hdate.getDate()} Элула ${hdate.getFullYear()}`;
    case 7: return `${hdate.getDate()} Тишрея ${hdate.getFullYear()}`;
    case 8: return `${hdate.getDate()} Хешвана ${hdate.getFullYear()}`;
    case 9: return `${hdate.getDate()} Кислева ${hdate.getFullYear()}`;
    case 10: return `${hdate.getDate()} Тевета ${hdate.getFullYear()}`;
    case 11: return `${hdate.getDate()} Швата ${hdate.getFullYear()}`;
    case 12: return `${hdate.getDate()} Адара ${hdate.getFullYear()}`;
    case 13: return `${hdate.getDate()} Адара Бет ${hdate.getFullYear()}`;
    default: return `${hdate.getDate()} ${month} ${hdate.getFullYear()}`.trim();
  }
}

export function formatGregorianAsHebrewDate(gregorianDate, lang = 'ru') {
  if (!gregorianDate || typeof gregorianDate.getDate !== 'function') {
    return '';
  }

  return formatHebrewDate(new Hebcal.HDate(gregorianDate), lang);
}

export function formatIsoDateAsHebrewDate(isoDate, lang = 'ru') {
  if (!isoDate) {
    return '';
  }

  const [year, month, day] = String(isoDate).split('-').map(Number);
  if (!year || !month || !day) {
    return '';
  }

  return formatGregorianAsHebrewDate(new Date(year, month - 1, day), lang);
}
