const test = require('node:test');
const assert = require('node:assert/strict');
const {
  transliterateToLatin,
  webAddressFromCommunityName,
  normalizeWebAddressInput,
  isValidWebAddress,
} = require('../lib/community-web-address');

test('transliterateToLatin converts Cyrillic and Hebrew', () => {
  assert.equal(transliterateToLatin('Новосибирск'), 'novosibirsk');
  assert.equal(transliterateToLatin('שלום'), 'shlvm');
});

test('webAddressFromCommunityName hyphenates transliterated words', () => {
  assert.equal(webAddressFromCommunityName('Новосибирск'), 'novosibirsk');
  assert.equal(webAddressFromCommunityName('Москва'), 'moskva');
  assert.equal(webAddressFromCommunityName('My Shul'), 'my-shul');
});

test('normalizeWebAddressInput preserves valid Latin addresses', () => {
  assert.equal(normalizeWebAddressInput('novo-sibirsk'), 'novo-sibirsk');
});

test('isValidWebAddress rejects empty and invalid patterns', () => {
  assert.equal(isValidWebAddress(''), false);
  assert.equal(isValidWebAddress('novosibirsk'), true);
  assert.equal(isValidWebAddress('!!!'), false);
});
