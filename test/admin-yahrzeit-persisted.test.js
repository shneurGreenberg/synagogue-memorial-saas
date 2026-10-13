const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildWeeklyKaddishScope,
  readWeeklyKaddishPayload,
  readYahrzeitTodayCount,
  buildYahrzeitTodayScope,
} = require('../lib/admin-yahrzeit-persisted');
const { computePeopleRevision } = require('../lib/people-revision');

describe('admin-yahrzeit-persisted', () => {
  const synagogue = {
    slug: 'test',
    location: { timezone: 'Asia/Jerusalem' },
    people: [{
      id: 1,
      name: 'A',
      gregorianDateOfDeath: { year: 2020, month: 1, date: 1 },
      contact: { phone: '1' },
    }],
    adminWeeklyKaddishCache: {
      weekKey: '2099-01-01',
      peopleRevision: '0:0:0:0',
      includeHebrewYahrzeit: true,
      entries: [{ id: 1, missingContact: true }],
      weekStartKey: '2099-01-01',
      weekEndKey: '2099-01-07',
      missingCount: 1,
    },
  };

  it('readWeeklyKaddishPayload returns null when revision mismatches', () => {
    const scope = buildWeeklyKaddishScope(synagogue, new Date('2099-01-03T12:00:00Z'));
    scope.weekKey = '2099-01-01';
    const hit = readWeeklyKaddishPayload(synagogue, scope);
    assert.equal(hit, null);
  });

  it('readYahrzeitTodayCount respects stored snapshot', () => {
    const scope = buildYahrzeitTodayScope(synagogue, new Date('2026-01-15T10:00:00Z'));
    const revision = computePeopleRevision(synagogue.people);
    const shul = {
      ...synagogue,
      adminYahrzeitTodayCache: {
        dayKey: scope.dayKey,
        peopleRevision: revision,
        includeHebrewYahrzeit: true,
        count: 3,
      },
    };
    assert.equal(readYahrzeitTodayCount(shul, scope), 3);
  });
});
