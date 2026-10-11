const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseOptionalDeathDate,
  parseDeathDateFields,
  personHasDeathDate,
  normalizePersonDeathDate,
  countPeopleWithoutDeathDate,
  entryShowsDeathDate,
} = require('../lib/death-date');
const { buildYahrzeitEntries } = require('../lib/yahrzeit');
const { toPublicBoardPayload } = require('../lib/public-board');

describe('optional death dates', () => {
  it('does not substitute 1 January 1900 when the date is missing or incomplete', () => {
    assert.equal(parseOptionalDeathDate(undefined), null);
    assert.equal(parseOptionalDeathDate(null), null);
    assert.equal(parseOptionalDeathDate({}), null);
    assert.equal(parseOptionalDeathDate({ month: 1, date: 1 }), null);
    assert.equal(parseOptionalDeathDate({ year: 1900 }), null);
    assert.deepEqual(
      parseOptionalDeathDate({ month: '3', date: '15', year: '2020' }),
      { month: 3, date: 15, year: 2020 },
    );
    assert.deepEqual(
      parseOptionalDeathDate({ month: 1, date: 1, year: 1900 }),
      { month: 1, date: 1, year: 1900 },
    );
  });

  it('accepts an empty form date and rejects a partial one', () => {
    assert.equal(parseDeathDateFields('', '', ''), null);
    assert.equal(parseDeathDateFields(undefined, undefined, undefined), null);
    assert.throws(() => parseDeathDateFields('1', '', '2020'), /incomplete_death_date/);
    assert.deepEqual(parseDeathDateFields('3', '2', '1991'), { month: 3, date: 2, year: 1991 });
  });

  it('normalizes stored people without inventing a date', () => {
    const undated = normalizePersonDeathDate({ id: 4, name: 'No Date' });
    assert.equal(undated.gregorianDateOfDeath, null);
    assert.equal(undated.hasDeathDate, false);
    assert.equal(personHasDeathDate(undated), false);
    assert.equal(entryShowsDeathDate(undated), false);
    assert.equal(countPeopleWithoutDeathDate([
      undated,
      { name: 'Dated', gregorianDateOfDeath: { month: 2, date: 2, year: 2002 } },
    ]), 1);
  });

  it('never counts an undated person as a yahrzeit, including on 1 January', () => {
    const synagogue = {
      slug: 'demo',
      location: { timezone: 'UTC' },
      yahrzeitReminders: { includeHebrewYahrzeit: true },
      people: [
        { id: 1, name: 'Undated' },
        { id: 2, name: 'Null date', gregorianDateOfDeath: null },
        { id: 3, name: 'Partial', gregorianDateOfDeath: { month: 1, date: 1 } },
        { id: 4, name: 'Today', gregorianDateOfDeath: { month: 3, date: 15, year: 2001 } },
      ],
    };

    const january = buildYahrzeitEntries(synagogue, new Date('2026-01-01T12:00:00Z'));
    assert.equal(january.some((entry) => entry.name !== 'Today'), false);

    const march = buildYahrzeitEntries(synagogue, new Date('2026-03-15T12:00:00Z'));
    assert.ok(march.some((entry) => entry.name === 'Today'));
    assert.equal(march.some((entry) => entry.name === 'Undated'), false);
    assert.equal(march.some((entry) => entry.name === 'Partial'), false);
  });

  it('keeps undated people on the public board by name and without a fake date', () => {
    const payload = toPublicBoardPayload({
      slug: 'demo',
      people: [
        {
          id: 9,
          name: 'Undated Name',
          text: 'secret bio',
          contact: { phone: '+1' },
          gregorianDateOfDeath: { month: 1, date: 1 },
        },
      ],
    });

    assert.equal(payload.people.length, 1);
    assert.equal(payload.people[0].name, 'Undated Name');
    assert.equal(payload.people[0].gregorianDateOfDeath, null);
    assert.equal(payload.people[0].hasDeathDate, false);
    assert.equal(payload.people[0].text, undefined);
    assert.equal(payload.people[0].contact, undefined);
    assert.notDeepEqual(payload.people[0].gregorianDateOfDeath, { month: 1, date: 1, year: 1900 });
  });
});
