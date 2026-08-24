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

function isYahrzeitToday(person, timezone, now = new Date(), options = {}) {
  const death = person && person.gregorianDateOfDeath;
  if (!death || !death.month || !death.date) {
    return false;
  }

  const includeHebrew = options.includeHebrewYahrzeit !== false;

  return isGregorianYahrzeitToday(death, timezone, now)
    || (includeHebrew && isHebrewYahrzeitToday(death, timezone, now));
}

function resolveYahrzeitOptions(synagogue) {
  const reminders = synagogue && synagogue.yahrzeitReminders;
  return {
    includeHebrewYahrzeit: !reminders || reminders.includeHebrewYahrzeit !== false,
  };
}

function getPeopleWithYahrzeitToday(synagogue, now = new Date()) {
  const timezone = resolveSynagogueTimezone(synagogue);
  const options = resolveYahrzeitOptions(synagogue);

  return (synagogue.people || [])
    .filter((person) => isYahrzeitToday(person, timezone, now, options))
    .map((person) => enrichPersonYahrzeit(person, timezone, now, options));
}

const HEBREW_MONTH_NAMES = ['', 'ניסן', 'אייר', 'סיוון', 'תמוז', 'אב', 'אלול', 'תשרי', 'חשוון', 'כסלו', 'טבת', 'שבט', 'אדר', 'אדר ב'];

function hebrewDateFromGregorian(death) {
  if (!death || !death.year || !death.month || !death.date) {
    return null;
  }

  const gregorian = new Date(death.year, death.month - 1, death.date);
  if (Number.isNaN(gregorian.getTime())) {
    return null;
  }

  const hdate = new Hebcal.HDate(gregorian);
  const month = hdate.getMonth();

  return {
    year: hdate.getFullYear(),
    month,
    date: hdate.getDate(),
    label: `${hdate.getDate()} ${HEBREW_MONTH_NAMES[month] || ''}`.trim(),
  };
}

function formatHebrewDateLabel(gregorian) {
  const parts = hebrewDateFromGregorian({
    year: gregorian.getFullYear(),
    month: gregorian.getMonth() + 1,
    date: gregorian.getDate(),
  });
  return parts ? parts.label : '';
}

function enrichPersonYahrzeit(person, timezone, now = new Date(), options = {}) {
  const death = person.gregorianDateOfDeath || {};
  const includeHebrew = options.includeHebrewYahrzeit !== false;
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
    yahrzeitIsHebrewToday: includeHebrew && isHebrewYahrzeitToday(death, timezone, now),
  };
}

function isGregorianYahrzeitOnDate(death, date) {
  if (!death || !death.month || !death.date || !date) {
    return false;
  }

  return (date.getMonth() + 1) === death.month && date.getDate() === death.date;
}

function isHebrewYahrzeitOnDate(death, date) {
  if (!death || !death.year || !death.month || !death.date || !date) {
    return false;
  }

  const deathGregorian = new Date(death.year, death.month - 1, death.date);
  const deathHebrew = new Hebcal.HDate(deathGregorian);
  const dateHebrew = new Hebcal.HDate(date);

  return deathHebrew.getMonth() === dateHebrew.getMonth()
    && deathHebrew.getDate() === dateHebrew.getDate();
}

function isYahrzeitOnDate(person, date, options = {}) {
  const death = person && person.gregorianDateOfDeath;
  if (!death || !death.month || !death.date) {
    return false;
  }

  const includeHebrew = options.includeHebrewYahrzeit !== false;

  return isGregorianYahrzeitOnDate(death, date)
    || (includeHebrew && isHebrewYahrzeitOnDate(death, date));
}

function getPeopleWithYahrzeitThisWeekMissed(synagogue, now = new Date()) {
  const timezone = resolveSynagogueTimezone(synagogue);
  const options = resolveYahrzeitOptions(synagogue);
  const today = getGregorianDateInTimezone(timezone, now);
  const todayIds = new Set(
    getPeopleWithYahrzeitToday(synagogue, now).map((person) => person.id),
  );
  const seen = new Set();
  const results = [];

  for (let offset = -7; offset <= -1; offset += 1) {
    const date = new Date(today);
    date.setDate(date.getDate() + offset);

    (synagogue.people || []).forEach((person) => {
      if (todayIds.has(person.id) || seen.has(person.id)) {
        return;
      }

      if (isYahrzeitOnDate(person, date, options)) {
        seen.add(person.id);
        results.push({
          ...enrichPersonYahrzeit(person, timezone, date, options),
          missedYahrzeitDate: getDayKeyInTimezone(timezone, date),
        });
      }
    });
  }

  return results;
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
  getPeopleWithYahrzeitThisWeekMissed,
  isYahrzeitOnDate,
  buildYahrzeitEntries,
  resolveYahrzeitOptions,
  hebrewDateFromGregorian,
  HEBREW_MONTH_NAMES,
};
