const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  collapseGroupKey,
  processUpcomingHebcalHolidays,
  addDaysIso,
} = require('../lib/upcoming-holidays');

describe('regression: upcoming holidays (1.14+)', () => {
  it('keeps Yom Tov days separate (not merged with Chanukah)', () => {
    const items = [
      { category: 'holiday', date: '2026-09-25', title: 'Rosh Hashana', hebrew: 'ראש השנה', subcat: 'major' },
      { category: 'holiday', date: '2026-09-26', title: 'Rosh Hashana II', hebrew: 'ב׳ ראש השנה', subcat: 'major' },
    ];
    const result = processUpcomingHebcalHolidays(items, 'en', '2026-01-01', 10);
    assert.equal(result.length, 2);
    assert.equal(result[0].isRange, false);
    assert.equal(result[1].isRange, false);
  });

  it('merges consecutive Chol HaMoed days into one range', () => {
    const items = [
      { category: 'holiday', date: '2026-04-07', title: 'Pesach III (Chol Hamoed)', hebrew: 'ג׳ פסח', subcat: 'cholhamoed' },
      { category: 'holiday', date: '2026-04-08', title: 'Pesach IV (Chol Hamoed)', hebrew: 'ד׳ פסח', subcat: 'cholhamoed' },
    ];
    assert.equal(collapseGroupKey(items[0]).startsWith('chol:'), true);
    const result = processUpcomingHebcalHolidays(items, 'en', '2026-01-01', 10);
    assert.equal(result.length, 1);
    assert.equal(result[0].isRange, true);
    assert.equal(result[0].dateEnd, '2026-04-08');
  });

  it('default holiday feed uses a 30-day ahead window', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'lib', 'jewish-feed.js'),
      'utf8',
    );
    assert.match(src, /getUpcomingHolidays\(lang = 'ru', daysAhead = 30/);
    const today = '2026-10-01';
    const past = { category: 'holiday', date: '2026-09-20', title: 'Past', hebrew: '', subcat: 'major' };
    const future = { category: 'holiday', date: addDaysIso(today, 10), title: 'Sukkot', hebrew: '', subcat: 'major' };
    const result = processUpcomingHebcalHolidays([past, future], 'en', today, 20);
    assert.equal(result.length, 1);
    assert.match(result[0].title, /Sukkot/i);
  });
});
