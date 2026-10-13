const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveCommunityDisplayName } = require('../lib/community-display-name');

test('Tomsk Hebrew admin shows טומסק only', () => {
  const name = resolveCommunityDisplayName(
    { slug: 'tomsk', name: 'תומסק / טומסק' },
    'he',
  );
  assert.equal(name, 'טומסק');
});

test('falls back to synagogue name when unmapped', () => {
  assert.equal(
    resolveCommunityDisplayName({ slug: 'demo', name: 'Demo Community' }, 'en'),
    'Demo Community',
  );
});
