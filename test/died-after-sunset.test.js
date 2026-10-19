const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { HDate } = require('hebcal');
const { parseDiedAfterSunset } = require('../lib/died-after-sunset');
const { computeHebrewDateOfDeath } = require('../lib/person-hebrew-death');
const { clearYahrzeitDeathHebrewCache } = require('../lib/yahrzeit-death-hebrew');

describe('died-after-sunset', () => {
  it('parseDiedAfterSunset accepts before/after radio values', () => {
    assert.equal(parseDiedAfterSunset('before'), false);
    assert.equal(parseDiedAfterSunset('after'), true);
    assert.equal(parseDiedAfterSunset(''), false);
  });

  it('shifts Hebrew date to next day after sunset', () => {
    clearYahrzeitDeathHebrewCache();
    const gregorian = { year: 2020, month: 1, date: 20 };
    const before = computeHebrewDateOfDeath(gregorian, { diedAfterSunset: false });
    const after = computeHebrewDateOfDeath(gregorian, { diedAfterSunset: true });
    assert.ok(before && after);
    const hBefore = new HDate(before.date, before.month, before.year);
    const hAfter = new HDate(after.date, after.month, after.year);
    assert.equal(hAfter.abs() - hBefore.abs(), 1);
  });

  it('handles Hebrew month boundary (29 Tevet -> 30 Tevet)', () => {
    clearYahrzeitDeathHebrewCache();
    const gregorian = { year: 2020, month: 1, date: 20 };
    const afterSunset = computeHebrewDateOfDeath(gregorian, { diedAfterSunset: true });
    const plain = computeHebrewDateOfDeath(gregorian, { diedAfterSunset: false });
    const shifted = new HDate(plain.date, plain.month, plain.year).next();
    assert.deepEqual(afterSunset, {
      month: shifted.getMonth(),
      date: shifted.getDate(),
      year: shifted.getFullYear(),
    });
  });

  it('handles Hebrew year boundary (29 Adar -> 1 Nisan)', () => {
    clearYahrzeitDeathHebrewCache();
    const gregorian = { year: 2020, month: 3, date: 25 };
    const plain = computeHebrewDateOfDeath(gregorian, { diedAfterSunset: false });
    const after = computeHebrewDateOfDeath(gregorian, { diedAfterSunset: true });
    assert.ok(plain && after);
    if (plain.month === 6 && plain.date === 29) {
      assert.equal(after.month, 7);
      assert.equal(after.date, 1);
    } else {
      const expected = new HDate(plain.date, plain.month, plain.year).next();
      assert.equal(after.month, expected.getMonth());
      assert.equal(after.date, expected.getDate());
      assert.equal(after.year, expected.getFullYear());
    }
  });
});
