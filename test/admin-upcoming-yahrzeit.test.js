const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildUpcomingYahrzeitRows } = require('../lib/admin-upcoming-yahrzeit');
const { getCachedAdminYahrzeitBundle, invalidateAdminYahrzeitCache } = require('../lib/admin-yahrzeit-cache');

function synagogue(slug, people) {
  return {
    slug,
    location: { timezone: 'Asia/Jerusalem' },
    yahrzeitReminders: { includeHebrewYahrzeit: true },
    people,
  };
}

describe('admin upcoming yahrzeit lists', () => {
  const now = new Date('2026-10-12T12:00:00+03:00');

  it('only includes people from the given synagogue', () => {
    const shulA = synagogue('alpha', [
      { id: 'a1', name: 'Alpha Person', gregorianDateOfDeath: { year: 1990, month: 10, date: 14 } },
    ]);
    const shulB = synagogue('beta', [
      { id: 'b1', name: 'Beta Person', gregorianDateOfDeath: { year: 1990, month: 10, date: 14 } },
    ]);

    const weekA = buildUpcomingYahrzeitRows(shulA, now, 7, 'he');
    const weekB = buildUpcomingYahrzeitRows(shulB, now, 7, 'he');

    assert.equal(weekA.length, 1);
    assert.equal(weekA[0].name, 'Alpha Person');
    assert.equal(weekB.length, 1);
    assert.equal(weekB[0].name, 'Beta Person');
  });

  it('respects week (7) and month (30) day boundaries', () => {
    const shul = {
      ...synagogue('bounds', [
      { id: 'd0', name: 'Today', gregorianDateOfDeath: { year: 2000, month: 10, date: 12 } },
      { id: 'd7', name: 'Day Seven', gregorianDateOfDeath: { year: 2000, month: 10, date: 18 } },
      { id: 'd8', name: 'Day Eight', gregorianDateOfDeath: { year: 2000, month: 10, date: 19 } },
      { id: 'd30', name: 'Day Thirty', gregorianDateOfDeath: { year: 2000, month: 11, date: 10 } },
      { id: 'd31', name: 'Day Thirty One', gregorianDateOfDeath: { year: 2000, month: 11, date: 11 } },
    ]),
      yahrzeitReminders: { includeHebrewYahrzeit: false },
    };

    const week = buildUpcomingYahrzeitRows(shul, now, 7, 'he');
    const month = buildUpcomingYahrzeitRows(shul, now, 30, 'he');
    const weekNames = new Set(week.map((row) => row.name));
    const monthNames = new Set(month.map((row) => row.name));

    assert.ok(weekNames.has('Today'));
    assert.ok(weekNames.has('Day Seven'));
    assert.equal(weekNames.has('Day Eight'), false);

    assert.ok(monthNames.has('Day Seven'));
    assert.ok(monthNames.has('Day Eight'));
    assert.ok(monthNames.has('Day Thirty'));
    assert.equal(monthNames.has('Day Thirty One'), false);
  });

  it('bundle exposes upcoming lists from cache', () => {
    invalidateAdminYahrzeitCache('cache-shul');
    const synagogueDoc = synagogue('cache-shul', [
      { id: 1, name: 'Cached', gregorianDateOfDeath: { year: 1985, month: 10, date: 15 } },
    ]);
    const bundle = getCachedAdminYahrzeitBundle(synagogueDoc, { now, adminLanguage: 'he' });
    assert.ok(Array.isArray(bundle.upcomingWeek));
    assert.ok(Array.isArray(bundle.upcomingMonth));
    assert.ok(bundle.upcomingMonth.length >= bundle.upcomingWeek.length);
  });
});
