const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeHayomYomText } = require('../lib/hayom-yom-sanitize');

describe('hayom yom sanitize', () => {
  const aphorism = 'When you spread out your palms, I will hide My eyes.';

  it('strips Russian return-to-text links and footnote debris', () => {
    const dirty = `${aphorism} ( Вернуться к тексту ) [2] (Footnotes 1)`;
    assert.equal(sanitizeHayomYomText(dirty), aphorism);
  });

  it('strips English return-to-text and compare-source lines', () => {
    const dirty = `Return to text ${aphorism} Compare Devarim 10: 12`;
    assert.equal(sanitizeHayomYomText(dirty), aphorism);
  });

  it('strips untranslated Russian source references', () => {
    const dirty = `${aphorism} Сравните Devarim 10: 12.`;
    assert.equal(sanitizeHayomYomText(dirty), aphorism);
  });

  it('leaves clean aphorisms unchanged', () => {
    assert.equal(sanitizeHayomYomText(`  ${aphorism}  `), aphorism);
    assert.equal(sanitizeHayomYomText(''), '');
  });
});
