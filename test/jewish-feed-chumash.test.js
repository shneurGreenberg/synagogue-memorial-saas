const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { resolveDailyChumashLabel } = require('../lib/daily-chumash-label');

const TZ = 'Asia/Novosibirsk';

describe('resolveDailyChumashLabel', () => {
  it('prefers weekly Diaspora Chitas over scraped or Hayom Yom text', () => {
    const now = new Date(Date.UTC(2026, 9, 13, 6, 0, 0));
    const label = resolveDailyChumashLabel({
      timezone: TZ,
      now,
      lessons5786Chumash: 'Lech-Lecha, Rishon',
      hayomYomChumashLabel: 'Lech Lecha, Sheini with Rashi',
      chokLeYisraelSefaria: { displayValue: { en: 'Noach', he: 'נח' } },
      lang: 'en',
    });
    assert.equal(label, 'Noach, Shlishi');
  });

  it('falls back to Chok LeYisrael (5786) lesson text when weekly parsha is unavailable', () => {
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
