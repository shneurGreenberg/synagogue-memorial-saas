const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  isHayomYomTranslationPlaceholder,
  sanitizeHayomYomText,
} = require('../lib/hayom-yom-sanitize');

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

  it('flags MyMemory and machine-translation placeholder strings', () => {
    const warning = 'MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY.';
    assert.equal(isHayomYomTranslationPlaceholder(warning), true);
    assert.equal(isHayomYomTranslationPlaceholder('hard to translate'), true);
    assert.equal(isHayomYomTranslationPlaceholder('Трудно перевести'), true);
    assert.equal(isHayomYomTranslationPlaceholder(aphorism), false);
    assert.equal(isHayomYomTranslationPlaceholder('Когда вы распростираете ладони'), false);
  });
});
