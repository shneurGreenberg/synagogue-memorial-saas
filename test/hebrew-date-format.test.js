const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const Hebcal = require('hebcal');
const { formatHebrewDate, formatIsoDateAsHebrewDate } = require('../lib/hebrew-date-format');

describe('hebrew-date-format', () => {
  it('formats Hebrew locale dates with gematria day and year', () => {
    const hdate = new Hebcal.HDate(15, 7, 5787);
    const formatted = formatHebrewDate(hdate, 'he');
    assert.match(formatted, /ט/);
    assert.match(formatted, /תשרי/);
    assert.match(formatted, /תשפ/);
  });

  it('keeps Russian locale dates numeric', () => {
    const hdate = new Hebcal.HDate(3, 7, 5787);
    const formatted = formatHebrewDate(hdate, 'ru');
    assert.equal(formatted, '3 Тишрея 5787');
  });

  it('formats ISO civil dates in Hebrew locale', () => {
    const formatted = formatIsoDateAsHebrewDate('2026-10-13', 'he');
    assert.ok(formatted.includes('חשוון'));
    assert.match(formatted, /תשפ/);
  });
});
