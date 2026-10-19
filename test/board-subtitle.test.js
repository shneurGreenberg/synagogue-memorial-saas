const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseBoardSubtitleFromBody,
  boardSubtitleToUpdate,
  parseBoardSubtitleThemeFromBody,
} = require('../lib/board-subtitle');

describe('board subtitle', () => {
  it('parses enabled flag and text from admin body', () => {
    const subtitle = parseBoardSubtitleFromBody({
      boardSubtitleEnabled: '1',
      boardSubtitleText: 'בית הכנסת קלינינגרד',
    }, { enabled: false, text: '' });
    assert.equal(subtitle.enabled, true);
    assert.equal(subtitle.text, 'בית הכנסת קלינינגרד');

    const update = boardSubtitleToUpdate(subtitle);
    assert.equal(update['boardSubtitle.enabled'], true);
    assert.equal(update['boardSubtitle.text'], 'בית הכנסת קלינינגרד');
  });

  it('parses subtitle theme styling', () => {
    const theme = parseBoardSubtitleThemeFromBody({
      boardSubtitleColor: '#aabbcc',
      boardSubtitleFont: 'heebo',
      boardSubtitleWeight: '600',
    }, {});
    assert.equal(theme.boardSubtitleColor, '#aabbcc');
    assert.equal(theme.boardSubtitleFont, 'heebo');
    assert.equal(theme.boardSubtitleWeight, '600');
  });
});
