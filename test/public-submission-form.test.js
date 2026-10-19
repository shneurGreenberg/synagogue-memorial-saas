const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseDeceasedEntriesFromBody,
  validateDeceasedEntries,
  parseIsoDeathDate,
} = require('../lib/public-submission-form');
const { formatRelationLabel } = require('../lib/submission-relation');

describe('public-submission-form', () => {
  it('parseIsoDeathDate validates calendar dates', () => {
    assert.deepEqual(parseIsoDeathDate('2020-03-15'), { year: 2020, month: 3, date: 15 });
    assert.equal(parseIsoDeathDate('2020-02-30'), null);
  });

  it('parses dd.mm.yyyy deathDate field', () => {
    const entries = parseDeceasedEntriesFromBody({
      lang: 'he',
      deceased: {
        0: {
          name: 'A',
          fatherName: 'B',
          relationKey: 'ben',
          deceasedGender: 'male',
          deathDate: '15.03.2020',
          diedAfterSunset: 'before',
        },
      },
    });
    assert.deepEqual(entries[0].gregorianDateOfDeath, { year: 2020, month: 3, date: 15 });
  });

  it('parses multiple deceased blocks from body', () => {
    const entries = parseDeceasedEntriesFromBody({
      lang: 'he',
      deceasedNotes: 'shared',
      deceased: {
        0: {
          name: 'A',
          fatherName: 'B',
          relationKey: 'ben',
          deceasedGender: 'male',
          deathDay: '2',
          deathMonth: '1',
          deathYear: '2020',
          diedAfterSunset: 'after',
        },
        1: {
          name: 'C',
          fatherName: 'D',
          relationKey: 'other',
          relationOther: 'אחיין',
          deceasedGender: 'female',
          deathDay: '10',
          deathMonth: '5',
          deathYear: '2021',
          diedAfterSunset: 'before',
        },
      },
    });
    assert.equal(entries.length, 2);
    assert.equal(entries[0].diedAfterSunset, true);
    assert.equal(entries[1].relation, 'אחיין');
    assert.equal(entries[1].deceasedNotes, 'shared');
  });

  it('validateDeceasedEntries requires father name', () => {
    const err = validateDeceasedEntries([{
      name: 'X',
      fatherName: '',
      relationKey: 'ben',
      deceasedGender: 'male',
      gregorianDateOfDeath: { year: 2020, month: 1, date: 1 },
    }]);
    assert.equal(err, 'father');
  });

  it('formatRelationLabel translates keys', () => {
    assert.equal(formatRelationLabel('ben', '', 'ru'), 'сын');
    assert.equal(formatRelationLabel('other', 'cousin', 'en'), 'cousin');
  });
});
