const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  computeHebrewDateOfDeath,
  getHebrewHDateForPerson,
  collectPeopleMissingHebrewDeath,
} = require('../lib/person-hebrew-death');

describe('person-hebrew-death', () => {
  it('computes Hebrew date from gregorian death', () => {
    const hebrew = computeHebrewDateOfDeath({ year: 2020, month: 1, date: 1 });
    assert.ok(hebrew && hebrew.month && hebrew.date && hebrew.year);
  });

  it('prefers stored Hebrew date on person', () => {
    const person = {
      gregorianDateOfDeath: { year: 2020, month: 6, date: 15 },
      hebrewDateOfDeath: { month: 1, date: 15, year: 5780 },
    };
    const hdate = getHebrewHDateForPerson(person);
    assert.equal(hdate.getMonth(), 1);
    assert.equal(hdate.getDate(), 15);
  });

  it('collectPeopleMissingHebrewDeath mutates list in memory', () => {
    const people = [{
      id: 1,
      gregorianDateOfDeath: { year: 2020, month: 1, date: 1 },
    }];
    const missing = collectPeopleMissingHebrewDeath(people);
    assert.equal(missing.length, 1);
    assert.ok(people[0].hebrewDateOfDeath);
  });
});
