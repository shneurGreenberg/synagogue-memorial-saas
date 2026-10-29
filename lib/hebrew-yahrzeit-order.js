const Hebcal = require('hebcal');

function hebrewAnniversaryGregorian(deathHebrew, hebrewYear) {
  let month = deathHebrew.getMonth();
  const leap = new Hebcal.HDate(1, 7, hebrewYear).isLeapYear();
  // Adar II (13) in a regular year -> Adar (12).
  if (month === 13 && !leap) month = 12;
  const day = Math.min(deathHebrew.getDate(), new Hebcal.HDate(1, month, hebrewYear).daysInMonth());
  return new Hebcal.HDate(day, month, hebrewYear).greg();
}

/**
 * 1.30.0 I10: days from today until the next Hebrew-calendar yahrzeit (0 = today).
 * Returns null when it cannot be computed (caller falls back to the Gregorian order).
 */
function daysUntilHebrewYahrzeit(death, today) {
  try {
    if (!death || !death.year || !death.month || !death.date || !today) return null;
    const deathHebrew = new Hebcal.HDate(new Date(death.year, death.month - 1, death.date));
    const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayHebrew = new Hebcal.HDate(base);
    const dayMs = 24 * 60 * 60 * 1000;
    for (let offset = 0; offset < 2; offset += 1) {
      const g = hebrewAnniversaryGregorian(deathHebrew, todayHebrew.getFullYear() + offset);
      const diff = Math.round((new Date(g.getFullYear(), g.getMonth(), g.getDate()) - base) / dayMs);
      if (diff >= 0) return diff;
    }
    return null;
  } catch {
    return null;
  }
}

module.exports = { daysUntilHebrewYahrzeit };
