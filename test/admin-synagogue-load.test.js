const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  PROFILES,
  invalidateAdminSynagogueCache,
  _cacheForTests,
} = require('../lib/admin-synagogue-load');

describe('admin-synagogue-load', () => {
  it('defines projection profiles without loading people biography fields in settings', () => {
    assert.ok(PROFILES.context);
    assert.ok(PROFILES.settings.includes('adminUsers'));
    assert.ok(PROFILES.settings.includes('people.id'));
    assert.ok(!PROFILES.settings.includes('people.text'));
    assert.ok(PROFILES.people.includes('people.text'));
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
});
