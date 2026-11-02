'use strict';
// 1.31.4 I37: the yahrzeit follows the board calendar; the old "include Hebrew yahrzeit" toggle is ignored.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { resolveYahrzeitOptions, isYahrzeitOnDate } = require('../lib/yahrzeit');

describe('1.31.4 I37 yahrzeit follows board calendar', () => {
  it('Gregorian board counts only the Gregorian anniversary even if the old toggle was on', () => {
    const opts = resolveYahrzeitOptions({ yahrzeitReminders: { includeHebrewYahrzeit: true } });
    assert.equal(opts.includeHebrewYahrzeit, false);
    assert.equal(opts.includeGregorianYahrzeit, true);
  });

  it('Hebrew board counts only the Hebrew anniversary even if the old toggle was off', () => {
    const shul = { boardCalendar: 'hebrew', yahrzeitReminders: { includeHebrewYahrzeit: false } };
    const opts = resolveYahrzeitOptions(shul);
    assert.equal(opts.boardCalendar, 'hebrew');
    assert.equal(opts.includeHebrewYahrzeit, true);
    assert.equal(opts.includeGregorianYahrzeit, false);
  });

  it('a Gregorian board does not match on the Hebrew anniversary date', () => {
    const person = { id: 1, gregorianDateOfDeath: { year: 2020, month: 3, date: 10 } };
    const opts = resolveYahrzeitOptions({});
    // 2026-03-10 is the Gregorian anniversary.
    assert.equal(isYahrzeitOnDate(person, new Date(2026, 2, 10), opts), true);
    // The Hebrew anniversary in 2026 falls on a different Gregorian day.
    const hebrewOnly = { ...opts, includeHebrewYahrzeit: true, includeGregorianYahrzeit: false };
    let found = null;
    for (let d = 0; d < 60 && !found; d += 1) {
      const date = new Date(2026, 1, 15 + d);
      if (isYahrzeitOnDate(person, date, hebrewOnly) && !(date.getMonth() === 2 && date.getDate() === 10)) found = date;
    }
    assert.ok(found, 'expected a Hebrew anniversary date');
    assert.equal(isYahrzeitOnDate(person, found, opts), false);
  });
});

describe('1.31.4 I33 saved designs keep the middle background', () => {
  const { pickDesignFromSnapshot, buildDesignApplyUpdate } = require('../lib/saved-view-design');
  it('restores a saved middle background and clears it when saved empty', () => {
    const withBg = buildDesignApplyUpdate(pickDesignFromSnapshot({ theme: { middleBackground: 'mid.jpg' } }));
    assert.equal(withBg['theme.middleBackground'], 'mid.jpg');
    const empty = buildDesignApplyUpdate(pickDesignFromSnapshot({ theme: { middleBackground: '' } }));
    assert.equal(empty['theme.middleBackground'], '');
  });
  it('designs saved before 1.31.4 leave the middle background alone', () => {
    const old = buildDesignApplyUpdate(pickDesignFromSnapshot({ theme: { tilesBackground: 'a.jpg' } }));
    assert.equal('theme.middleBackground' in old, false);
  });
});
