import Hebcal from 'hebcal';
import {
  getGregorianDateInTimezone,
  getHebrewDateInTimezone,
} from './board-calendar';

function isGregorianYahrzeitToday(death, timezone, now = new Date()) {
  if (!death || !death.month || !death.date) {
    return false;
  }

  const today = getGregorianDateInTimezone(timezone, now);
  return today.getMonth() + 1 === death.month && today.getDate() === death.date;
}

function isHebrewYahrzeitToday(death, timezone, now = new Date()) {
  if (!death || !death.year || !death.month || !death.date) {
    return false;
  }

  const deathGregorian = new Date(death.year, death.month - 1, death.date);
  const deathHebrew = new Hebcal.HDate(deathGregorian);
  const todayHebrew = getHebrewDateInTimezone(timezone, now);

  return deathHebrew.getMonth() === todayHebrew.getMonth()
    && deathHebrew.getDate() === todayHebrew.getDate();
}

export function isPersonYahrzeitToday(person, timezone, now = new Date()) {
  const death = person && person.gregorianDateOfDeath;
  if (!death || !death.month || !death.date) {
    return false;
  }

  return isGregorianYahrzeitToday(death, timezone, now)
    || isHebrewYahrzeitToday(death, timezone, now);
}
