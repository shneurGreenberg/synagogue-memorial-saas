const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  getUpcomingChabadDates,
  daysAheadThroughEndOfNextMonth,
  endOfNextCalendarMonth,
} = require('../lib/chabad-dates');

describe('chabad-dates', () => {
  it('returns UTF-8 Russian titles for upcoming dates', () => {
    const from = new Date(2026, 10, 1);
    const dates = getUpcomingChabadDates('ru', from, 60);
    const kislev = dates.find((entry) => entry.title.includes('19 Кислева'));
    assert.ok(kislev, 'expected 19 Kislev entry');
    assert.match(kislev.title, /праздник освобождения/);
    assert.doesNotMatch(kislev.title, /РљРё/);
  });

  it('limits default range through end of next calendar month', () => {
    const from = new Date(2026, 9, 13);
    const end = endOfNextCalendarMonth(from);
    assert.equal(end.getFullYear(), 2026);
    assert.equal(end.getMonth(), 10);
    assert.equal(end.getDate(), 30);

    const ahead = daysAheadThroughEndOfNextMonth(from);
    const dates = getUpcomingChabadDates('en', from);
    dates.forEach((entry) => {
      assert.ok(entry.date <= '2026-11-30');
      assert.ok(entry.date >= '2026-10-13');
    });
    assert.ok(ahead === 48);
  });
});
