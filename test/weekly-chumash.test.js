const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { resolveComputedDailyChumashLabel } = require('../lib/weekly-chumash');

const TZ = 'Asia/Novosibirsk';

function atLocalNoonUtc(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day, 6, 0, 0));
}

describe('weekly Chumash (Diaspora Chitas)', () => {
  it('Tue 2026-10-13 in Asia/Novosibirsk is Noach Shlishi', () => {
    const now = atLocalNoonUtc(2026, 10, 13);
    assert.equal(resolveComputedDailyChumashLabel(TZ, now, 'en'), 'Noach, Shlishi');
    assert.equal(resolveComputedDailyChumashLabel(TZ, now, 'ru'), 'Ноах, 3-я часть');
    assert.equal(resolveComputedDailyChumashLabel(TZ, now, 'he'), 'נח, שלישי');
  });

  it('Wed 2026-10-14 in Asia/Novosibirsk is Noach Revi\'i', () => {
    const now = atLocalNoonUtc(2026, 10, 14);
    assert.equal(resolveComputedDailyChumashLabel(TZ, now, 'en'), "Noach, Revi'i");
    assert.equal(resolveComputedDailyChumashLabel(TZ, now, 'ru'), 'Ноах, 4-я часть');
    assert.equal(resolveComputedDailyChumashLabel(TZ, now, 'he'), 'נח, רביעי');
  });

  it('Sat 2026-10-17 in Asia/Novosibirsk is Noach Shvii (Shabbat)', () => {
    const now = atLocalNoonUtc(2026, 10, 17);
    assert.equal(resolveComputedDailyChumashLabel(TZ, now, 'en'), 'Noach, Shvii');
    assert.equal(resolveComputedDailyChumashLabel(TZ, now, 'he'), 'נח, שביעי');
  });
});
