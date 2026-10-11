function readInt(value) {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) ? parsed : null;
  }

  return null;
}

function isCompleteDeathDate(death) {
  if (!death || typeof death !== 'object' || typeof death.getTime === 'function') {
    return false;
  }

  const month = readInt(death.month);
  const date = readInt(death.date);
  const year = readInt(death.year);

  if (month == null || date == null || year == null) {
    return false;
  }

  if (month < 1 || month > 12 || date < 1 || date > 31 || year < 1 || year > 9999) {
    return false;
  }

  const probe = new Date(year, month - 1, date);
  return probe.getFullYear() === year
    && probe.getMonth() === month - 1
    && probe.getDate() === date;
}

function personHasDeathDate(person) {
  return isCompleteDeathDate(person && person.gregorianDateOfDeath);
}

function parseOptionalDeathDate(input) {
  if (!isCompleteDeathDate(input)) {
    return null;
  }

  return {
    month: readInt(input.month),
    date: readInt(input.date),
    year: readInt(input.year),
  };
}

function parseDeathDateFields(month, date, year) {
  const values = [month, date, year].map((value) => String(value == null ? '' : value).trim());
  const anyFilled = values.some(Boolean);

  if (!anyFilled) {
    return null;
  }

  const parsed = parseOptionalDeathDate({ month, date, year });
  if (!parsed) {
    const error = new Error('incomplete_death_date');
    error.code = 'incomplete_death_date';
    throw error;
  }

  return parsed;
}

function normalizePersonDeathDate(person) {
  if (!person || typeof person !== 'object') {
    return person;
  }

  const gregorianDateOfDeath = parseOptionalDeathDate(person.gregorianDateOfDeath || person.dateOfDeath);

  return {
    ...person,
    gregorianDateOfDeath,
    hasDeathDate: !!gregorianDateOfDeath,
  };
}

function countPeopleWithoutDeathDate(people) {
  return (Array.isArray(people) ? people : []).filter((person) => person && !personHasDeathDate(person)).length;
}

function entryShowsDeathDate(entry) {
  if (!entry) {
    return false;
  }

  if (entry.hasDeathDate === false) {
    return false;
  }

  const death = entry.gregorianDateOfDeath;
  if (!death) {
    return false;
  }

  if (typeof death.getTime === 'function') {
    return !Number.isNaN(death.getTime());
  }

  return personHasDeathDate({ gregorianDateOfDeath: death });
}

function personIsListedAsDated(person) {
  if (!person) {
    return false;
  }

  if (person.hasDeathDate === true) {
    return true;
  }

  if (person.hasDeathDate === false) {
    return false;
  }

  return entryShowsDeathDate(person);
}

module.exports = {
  isCompleteDeathDate,
  personHasDeathDate,
  parseOptionalDeathDate,
  parseDeathDateFields,
  normalizePersonDeathDate,
  countPeopleWithoutDeathDate,
  entryShowsDeathDate,
  personIsListedAsDated,
};
