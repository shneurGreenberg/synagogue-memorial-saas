const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { resolveDailyChumashLabel } = require('../lib/daily-chumash-label');

describe('resolveDailyChumashLabel', () => {
  it('prefers Chok LeYisrael (5786) lesson text when present', () => {
    const label = resolveDailyChumashLabel({
      lessons5786Chumash: 'Bereishit 3',
      hayomYomChumashLabel: 'Hayom fallback',
      chokLeYisraelSefaria: { displayValue: { en: 'Noach', he: 'נח' } },
      lang: 'ru',
    });
    assert.match(label, /Bereishit|Берешит/i);
  });

  it('falls back to Hayom Yom Chitas chumash when 5786 scrape is empty', () => {
    const label = resolveDailyChumashLabel({
      lessons5786Chumash: '',
      hayomYomChumashLabel: "Lech Lecha, Sheini with Rashi",
      chokLeYisraelSefaria: null,
      lang: 'en',
    });
    assert.equal(label, "Lech Lecha, Sheini with Rashi");
  });

  it('uses Sefaria Chok LeYisrael when other sources are empty', () => {
    const label = resolveDailyChumashLabel({
      lessons5786Chumash: '',
      hayomYomChumashLabel: '',
      chokLeYisraelSefaria: { displayValue: { en: 'Noach', he: 'נח' } },
      lang: 'he',
    });
    assert.equal(label, 'נח');
  });
});
