const Hebcal = require('hebcal');
const { getCachedDeathHebrew } = require('./yahrzeit-death-hebrew');

function computeHebrewDateOfDeath(gregorianDeath) {
  if (!gregorianDeath || !gregorianDeath.year || !gregorianDeath.month || !gregorianDeath.date) {
    return null;
  }
  const hdate = getCachedDeathHebrew(gregorianDeath);
  if (!hdate) {
    return null;
  }
  return {
    month: hdate.getMonth(),
    date: hdate.getDate(),
    year: hdate.getFullYear(),
  };
}

function hasStoredHebrewDeath(hebrew) {
  return !!(hebrew && hebrew.month && hebrew.date);
}

function getHebrewHDateForPerson(person) {
  if (!person) {
    return null;
  }
  if (hasStoredHebrewDeath(person.hebrewDateOfDeath)) {
    const { date, month, year } = person.hebrewDateOfDeath;
    return new Hebcal.HDate(date, month, year);
  }
  const death = person.gregorianDateOfDeath;
  if (!death || !death.year || !death.month || !death.date) {
    return null;
  }
  return getCachedDeathHebrew(death);
}

function applyHebrewDateOfDeathToPerson(person) {
  if (!person || typeof person !== 'object') {
    return person;
  }
  if (hasStoredHebrewDeath(person.hebrewDateOfDeath)) {
    return person;
  }
  const computed = computeHebrewDateOfDeath(person.gregorianDateOfDeath);
  if (!computed) {
    return person;
  }
  return { ...person, hebrewDateOfDeath: computed };
}

function collectPeopleMissingHebrewDeath(people) {
  const list = Array.isArray(people) ? people : [];
  const missing = [];
  for (const person of list) {
    if (!person || !person.id) {
      continue;
    }
    if (hasStoredHebrewDeath(person.hebrewDateOfDeath)) {
      continue;
    }
    const computed = computeHebrewDateOfDeath(person.gregorianDateOfDeath);
    if (!computed) {
      continue;
    }
    missing.push({ id: person.id, hebrewDateOfDeath: computed });
    person.hebrewDateOfDeath = computed;
  }
  return missing;
}

module.exports = {
  computeHebrewDateOfDeath,
  hasStoredHebrewDeath,
  getHebrewHDateForPerson,
  applyHebrewDateOfDeathToPerson,
  collectPeopleMissingHebrewDeath,
};
