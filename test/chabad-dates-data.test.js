const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const {
  CHABAD_DATES,
  CHABAD_DATES_PATH,
  loadChabadDates,
  hebrewMonthsForEntry,
  getUpcomingChabadDates,
} = require('../lib/chabad-dates');

describe('chabad-dates data', () => {
  it('loads UTF-8 JSON with required fields for every entry', () => {
    const raw = fs.readFileSync(CHABAD_DATES_PATH, 'utf8');
    assert.doesNotMatch(raw, /Рљ/);
    const dates = loadChabadDates();
    assert.ok(dates.length >= 20);
    dates.forEach((entry) => {
      assert.ok(entry.hMonth >= 1 && entry.hMonth <= 13);
      assert.ok(entry.hDay >= 1 && entry.hDay <= 30);
      ['he', 'ru', 'en'].forEach((lang) => {
        assert.ok(entry.title[lang], `title.${lang} for ${entry.hMonth}/${entry.hDay}`);
        assert.ok(entry.description[lang], `description.${lang} for ${entry.hMonth}/${entry.hDay}`);
      });
    });
    assert.equal(dates.length, CHABAD_DATES.length);
  });

  it('resolves Adar II policy in leap years', () => {
    const entry = { hMonth: 12, hDay: 7, adarPolicy: 'ii' };
    assert.deepEqual(hebrewMonthsForEntry(entry, 5784), [13]);
    assert.deepEqual(hebrewMonthsForEntry(entry, 5783), [12]);
  });

  it('includes classic geulah and yahrzeit entries in range', () => {
    const from = new Date(2026, 5, 1);
    const dates = getUpcomingChabadDates('en', from, 400);
    assert.ok(dates.some((entry) => entry.title.includes('19 Kislev')));
    assert.ok(dates.some((entry) => entry.title.includes('3 Tammuz')));
    assert.ok(dates.some((entry) => entry.title.includes('28 Sivan')));
    assert.ok(!dates.some((entry) => entry.title.includes('28 Nissan')));
  });
});
