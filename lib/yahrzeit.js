const Hebcal = require('hebcal');

function getDatePartsInTimezone(timezone, now = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = {};
  formatter.formatToParts(now).forEach((part) => {
    if (part.type !== 'literal') {
      parts[part.type] = part.value;
    }
  });

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

function getGregorianDateInTimezone(timezone, now = new Date()) {
  const parts = getDatePartsInTimezone(timezone, now);
  return new Date(parts.year, parts.month - 1, parts.day);
}

function getHebrewDateInTimezone(timezone, now = new Date()) {
  return new Hebcal.HDate(getGregorianDateInTimezone(timezone, now));
}

function getDayKeyInTimezone(timezone, now = new Date()) {
  const parts = getDatePartsInTimezone(timezone, now);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function resolveSynagogueTimezone(synagogue) {
  return (synagogue && synagogue.location && synagogue.location.timezone) || 'Asia/Jerusalem';
}

function isGregorianYahrzeitToday(death, timezone, now = new Date()) {
  if (!death || !death.month || !death.date) {
    return false;
  }

  const today = getDatePartsInTimezone(timezone, now);
  return today.month === death.month && today.day === death.date;
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

function isYahrzeitToday(person, timezone, now = new Date()) {
  const death = person && person.gregorianDateOfDeath;
  if (!death || !death.month || !death.date) {
    return false;
  }

  return isGregorianYahrzeitToday(death, timezone, now)
    || isHebrewYahrzeitToday(death, timezone, now);
}

function getPeopleWithYahrzeitToday(synagogue, now = new Date()) {
  const timezone = resolveSynagogueTimezone(synagogue);

  return (synagogue.people || [])
    .filter((person) => isYahrzeitToday(person, timezone, now))
    .map((person) => enrichPersonYahrzeit(person, timezone, now));
}

function formatHebrewDateLabel(gregorian) {
  const hdate = new Hebcal.HDate(gregorian);
  const months = ['', 'ניסן', 'אייר', 'סיוון', 'תמוז', 'אב', 'אלול', 'תשרי', 'חשוון', 'כסלו', 'טבת', 'שבט', 'אדר', 'אדר ב'];
  const month = months[hdate.getMonth()] || '';
  return `${hdate.getDate()} ${month}`.trim();
}

function enrichPersonYahrzeit(person, timezone, now = new Date()) {
  const death = person.gregorianDateOfDeath || {};
  let hebrewDateLabel = '';

  if (death.year) {
    const gregorian = new Date(death.year, death.month - 1, death.date);
    hebrewDateLabel = formatHebrewDateLabel(gregorian);
  }

  return {
    ...person,
    hebrewDateLabel,
    gregorianDateLabel: death.year
      ? `${death.date}/${death.month}/${death.year}`
      : '',
    boardCardUrl: null,
    yahrzeitIsGregorianToday: isGregorianYahrzeitToday(death, timezone, now),
    yahrzeitIsHebrewToday: isHebrewYahrzeitToday(death, timezone, now),
  };
}

function buildYahrzeitEntries(synagogue, now = new Date()) {
  const timezone = resolveSynagogueTimezone(synagogue);
  const slug = synagogue.slug;

  return getPeopleWithYahrzeitToday(synagogue, now).map((person) => ({
    ...person,
    boardCardUrl: `/s/${slug}/card/${person.id}`,
    adminCardUrl: `/admin/${slug}/yahrzeit#person-${person.id}`,
  }));
}

module.exports = {
  getDatePartsInTimezone,
  getGregorianDateInTimezone,
  getHebrewDateInTimezone,
  getDayKeyInTimezone,
  resolveSynagogueTimezone,
  isGregorianYahrzeitToday,
  isHebrewYahrzeitToday,
  isYahrzeitToday,
  getPeopleWithYahrzeitToday,
  buildYahrzeitEntries,
};
