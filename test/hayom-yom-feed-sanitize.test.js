const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeLocalizedText } = require('../lib/mymemory-translate');

describe('hayom yom localized text', () => {
  it('never surfaces stored MyMemory warning strings', () => {
    const warning = 'MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY.';
    const english = 'When you spread out your palms, I will hide My eyes.';
    assert.equal(sanitizeLocalizedText(warning, english), english);
    assert.equal(sanitizeLocalizedText('', english), english);
    assert.equal(sanitizeLocalizedText('Перевод', english), 'Перевод');
  });
});
