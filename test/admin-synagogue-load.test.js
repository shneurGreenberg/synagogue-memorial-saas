const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  PROFILES,
  invalidateAdminSynagogueCache,
  _cacheForTests,
} = require('../lib/admin-synagogue-load');
const { getCachedAdminYahrzeitBundle, _cacheForTests: yahrzeitCache } = require('../lib/admin-yahrzeit-cache');

describe('admin-synagogue-load', () => {
  it('defines projection profiles without loading people biography fields in settings', () => {
    assert.ok(PROFILES.context);
    assert.ok(PROFILES.settings.includes('adminUsers'));
    assert.ok(PROFILES.settings.includes('people.id'));
    assert.ok(!PROFILES.settings.includes('people.text'));
    assert.ok(PROFILES.people.includes('people.text'));
    assert.ok(PROFILES.yahrzeit.includes('people.contact'));
    assert.ok(!PROFILES.yahrzeit.includes('people.text'));
  });

  it('invalidateAdminSynagogueCache clears slug entries only', () => {
    _cacheForTests.set('a:settings', { value: 1, expiresAt: Date.now() + 60000 });
    _cacheForTests.set('b:settings', { value: 2, expiresAt: Date.now() + 60000 });
    invalidateAdminSynagogueCache('a');
    assert.equal(_cacheForTests.has('a:settings'), false);
    assert.equal(_cacheForTests.has('b:settings'), true);
    invalidateAdminSynagogueCache();
    assert.equal(_cacheForTests.size, 0);
  });

  it('invalidateAdminSynagogueCache clears yahrzeit compute cache for slug', () => {
    const synagogue = {
      slug: 'inv-shul',
      location: { timezone: 'Asia/Jerusalem' },
      yahrzeitReminders: { includeHebrewYahrzeit: true },
      publicSubmission: {},
      people: [{ id: 1, gregorianDateOfDeath: { year: 2000, month: 5, date: 1 } }],
    };
    const now = new Date('2026-05-01T10:00:00+03:00');
    getCachedAdminYahrzeitBundle(synagogue, { now, adminLanguage: 'he' });
    assert.ok([...yahrzeitCache.keys()].some((key) => key.startsWith('inv-shul:')));
    invalidateAdminSynagogueCache('inv-shul');
    assert.equal([...yahrzeitCache.keys()].some((key) => key.startsWith('inv-shul:')), false);
  });
});
