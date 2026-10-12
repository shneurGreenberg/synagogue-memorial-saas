const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  getCachedAdminYahrzeitBundle,
  getCachedYahrzeitTodayCount,
  invalidateAdminYahrzeitCache,
  _cacheForTests,
} = require('../lib/admin-yahrzeit-cache');
const { computePeopleRevision } = require('../lib/people-revision');

function synagogueWithPeople(people) {
  return {
    slug: 'test-shul',
    location: { timezone: 'Asia/Jerusalem' },
    yahrzeitReminders: { includeHebrewYahrzeit: true },
    publicSubmission: {},
    people,
  };
}

describe('admin-yahrzeit-cache', () => {
  it('computePeopleRevision changes when death date changes', () => {
    const a = [{ id: 1, gregorianDateOfDeath: { year: 2000, month: 1, date: 2 } }];
    const b = [{ id: 1, gregorianDateOfDeath: { year: 2000, month: 1, date: 3 } }];
    assert.notEqual(computePeopleRevision(a), computePeopleRevision(b));
  });

  it('getCachedAdminYahrzeitBundle returns same object on warm cache', () => {
    invalidateAdminYahrzeitCache('test-shul');
    const synagogue = synagogueWithPeople([
      { id: 1, name: 'A', gregorianDateOfDeath: { year: 1990, month: 10, date: 12 } },
    ]);
    const now = new Date('2026-10-12T12:00:00+03:00');
    const first = getCachedAdminYahrzeitBundle(synagogue, { now, adminLanguage: 'he' });
    const second = getCachedAdminYahrzeitBundle(synagogue, { now, adminLanguage: 'he' });
    assert.equal(first, second);
    assert.ok(Array.isArray(first.entries));
  });

  it('invalidateAdminYahrzeitCache clears slug entries only', () => {
    _cacheForTests.set('a:bundle:x', { value: 1, expiresAt: Date.now() + 60000 });
    _cacheForTests.set('b:bundle:x', { value: 2, expiresAt: Date.now() + 60000 });
    invalidateAdminYahrzeitCache('a');
    assert.equal(_cacheForTests.has('a:bundle:x'), false);
    assert.equal(_cacheForTests.has('b:bundle:x'), true);
    invalidateAdminYahrzeitCache('b');
    assert.equal(_cacheForTests.has('b:bundle:x'), false);
  });

  it('getCachedYahrzeitTodayCount shares scope with bundle invalidation', () => {
    invalidateAdminYahrzeitCache('test-shul');
    const synagogue = synagogueWithPeople([
      { id: 2, name: 'B', gregorianDateOfDeath: { year: 1980, month: 3, date: 1 } },
    ]);
    const now = new Date('2026-03-01T09:00:00+02:00');
    const count = getCachedYahrzeitTodayCount(synagogue, now);
    const countKey = [..._cacheForTests.keys()].find((key) => key.startsWith('test-shul:count:'));
    assert.ok(countKey);
    assert.equal(typeof count, 'number');
    invalidateAdminYahrzeitCache('test-shul');
    assert.equal(_cacheForTests.has(countKey), false);
  });
});
