const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  isSigdHoliday,
  processUpcomingHebcalHolidays,
} = require('../lib/upcoming-holidays');

describe('upcoming-holidays', () => {
  it('filters Sigd', () => {
    assert.equal(isSigdHoliday({ title: 'Sigd', hebrew: 'סיגד' }), true);
    assert.equal(isSigdHoliday({ title: 'Rosh Hashana' }), false);
  });

  it('collapses consecutive Chanukah days into one range', () => {
    const items = [
      { category: 'holiday', date: '2026-12-05', title: 'Chanukah: 1 Candle', hebrew: 'א׳ חנוכה', subcat: 'major' },
      { category: 'holiday', date: '2026-12-06', title: 'Chanukah: 2 Candles', hebrew: 'ב׳ חנוכה', subcat: 'major' },
      { category: 'holiday', date: '2026-12-07', title: 'Chanukah: 3 Candles', hebrew: 'ג׳ חנוכה', subcat: 'major' },
    ];

    const result = processUpcomingHebcalHolidays(items, 'en', '2026-01-01', 10);
    assert.equal(result.length, 1);
    assert.equal(result[0].date, '2026-12-05');
    assert.equal(result[0].dateEnd, '2026-12-07');
    assert.equal(result[0].isRange, true);
  });
});
