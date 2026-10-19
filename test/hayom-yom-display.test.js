const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getHayomYomDisplayText } = require('../lib/hayom-yom-display-text');

describe('hayom yom display text', () => {
  it('shows only the aphorism, not daily-study lesson lines', () => {
    const aphorism = 'When you spread out your palms, I will hide My eyes.';
    assert.equal(getHayomYomDisplayText(aphorism), aphorism);
    assert.equal(getHayomYomDisplayText(`  ${aphorism}  `), aphorism);
    assert.equal(getHayomYomDisplayText(''), '');
    assert.equal(getHayomYomDisplayText(null), '');
  });

  it('sanitizes scraped debris at read time', () => {
    const aphorism = 'When you spread out your palms, I will hide My eyes.';
    const dirty = `${aphorism} ( Вернуться к тексту ) Сравните Devarim 10: 12`;
    assert.equal(getHayomYomDisplayText(dirty), aphorism);
  });
});
