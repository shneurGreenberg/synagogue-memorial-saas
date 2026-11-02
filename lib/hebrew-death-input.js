'use strict';
// 1.31.3: admins may enter the date of death as a Hebrew date.
// Hebcal months: 1=Nisan … 6=Elul, 7=Tishrei … 12=Adar (Adar I in leap years), 13=Adar II.
const Hebcal = require('hebcal');

function readInt(v) {
  const n = Number.parseInt(String(v == null ? '' : v).trim(), 10);
  return Number.isInteger(n) ? n : null;
}

function isHebrewLeapYear(year) {
  return ((7 * year + 1) % 19) < 7;
}

/**
 * Convert a Hebrew date of death to the civil (daytime) Gregorian date.
 * Because the Gregorian date returned is the daytime date of that Hebrew day,
 * it must be stored with diedAfterSunset=false so the yahrzeit stays on the chosen Hebrew date.
 * Returns { gregorian: {month,date,year}, hebrew: {month,date,year} } or null when invalid.
 */
function hebrewDeathToGregorian(day, month, year) {
  const d = readInt(day);
  let m = readInt(month);
  const y = readInt(year);
  if (d == null || m == null || y == null) return null;
  if (y < 3762 || y > 9999 || m < 1 || m > 13 || d < 1 || d > 30) return null;
  if (m === 13 && !isHebrewLeapYear(y)) m = 12; // "Adar II" in a plain year = Adar
  let hd;
  try {
    hd = new Hebcal.HDate(d, m, y);
  } catch (err) {
    return null;
  }
  if (hd.getDate() !== d || hd.getMonth() !== m || hd.getFullYear() !== y) {
    return null; // e.g. 30 Cheshvan in a short year
  }
  const g = hd.greg();
  return {
    gregorian: { month: g.getMonth() + 1, date: g.getDate(), year: g.getFullYear() },
    hebrew: { month: m, date: d, year: y },
  };
}

function parseDeathDateMode(raw) {
  return String(raw || '').trim().toLowerCase() === 'hebrew' ? 'hebrew' : 'gregorian';
}

/** Returns null when all Hebrew fields are empty; throws incomplete_death_date when partially/invalidly filled. */
function parseHebrewDeathFields(day, month, year) {
  const any = [day, month, year].some((v) => String(v == null ? '' : v).trim() !== '');
  if (!any) return null;
  const res = hebrewDeathToGregorian(day, month, year);
  if (!res) {
    const error = new Error('incomplete_death_date');
    error.code = 'incomplete_death_date';
    throw error;
  }
  return res;
}

module.exports = { hebrewDeathToGregorian, parseHebrewDeathFields, parseDeathDateMode, isHebrewLeapYear };
