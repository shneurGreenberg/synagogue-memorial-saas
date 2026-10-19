const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveUnifiedText,
  resolveBoardTitleText,
  firstNonEmpty,
} = require('../lib/community-unified-copy');

describe('community unified copy', () => {
  it('prefers stored single field', () => {
    assert.equal(
      resolveUnifiedText('Typed once', { ru: 'RU', en: 'EN', he: 'HE' }, 'ru'),
      'Typed once',
    );
  });

  it('falls back to display language variant then first non-empty', () => {
    assert.equal(
      resolveUnifiedText('', { ru: '', en: 'English', he: 'עברית' }, 'he'),
      'עברית',
    );
    assert.equal(
      resolveUnifiedText('', { ru: 'Russian', en: '', he: '' }, 'en'),
      'Russian',
    );
    assert.equal(firstNonEmpty(['', 'b', 'c']), 'b');
  });

  it('resolveBoardTitleText uses community language for legacy triplets', () => {
    const title = resolveBoardTitleText({
      language: 'en',
      boardTitleText: '',
      titles: { ru: 'RU only', en: '', he: '' },
    });
    assert.equal(title, 'RU only');

    const heTitle = resolveBoardTitleText({
      language: 'he',
      boardTitleText: '',
      titles: { ru: '', en: 'EN line', he: 'HE line' },
    });
    assert.equal(heTitle, 'HE line');
  });
});
