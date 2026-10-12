const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getMasterTranslator } = require('../lib/master-translations');

describe('master translations', () => {
  it('always serves Hebrew regardless of requested language', () => {
    const tHe = getMasterTranslator('he');
    const tEn = getMasterTranslator('en');
    assert.equal(tHe('communities_heading'), 'קהילות');
    assert.equal(tEn('communities_heading'), 'קהילות');
    assert.match(tHe('refresh_display_screens'), /[\u0590-\u05FF]/);
  });
});
