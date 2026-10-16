const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { isValidSlug, normalizeSlug, SLUG_PATTERN } = require('../lib/normalize-slug');

describe('invariant: slug validation', () => {
  it('accepts lowercase hyphenated slugs', () => {
    assert.equal(isValidSlug('novosibirsk'), true);
    assert.equal(isValidSlug('my-shul-2'), true);
  });

  it('rejects invalid slugs', () => {
    assert.equal(isValidSlug(''), false);
    assert.equal(isValidSlug('Upper'), false);
    assert.equal(isValidSlug('a--b'), false);
    assert.equal(isValidSlug('-bad'), false);
  });

  it('normalizeSlug trims and lowercases', () => {
    assert.equal(normalizeSlug('  Foo-Bar  '), 'foo-bar');
  });

  it('schema pattern matches library', () => {
    assert.match('test-community', SLUG_PATTERN);
  });
});
