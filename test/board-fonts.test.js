const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  BOARD_FONTS,
  BOARD_FONT_PREVIEW_SAMPLE,
  buildAllBoardFontsGoogleHref,
} = require('../lib/board-fonts');

describe('board-fonts', () => {
  it('exposes Hebrew, Russian, and English preview samples on every font', () => {
    assert.match(BOARD_FONT_PREVIEW_SAMPLE, /שלום/);
    assert.match(BOARD_FONT_PREVIEW_SAMPLE, /Привет/);
    assert.match(BOARD_FONT_PREVIEW_SAMPLE, /Hello/);

    BOARD_FONTS.forEach((font) => {
      assert.equal(font.previewSample, BOARD_FONT_PREVIEW_SAMPLE);
    });
  });

  it('builds a combined Google Fonts href for admin previews', () => {
    const href = buildAllBoardFontsGoogleHref();
    assert.ok(href);
    assert.match(href, /fonts\.googleapis\.com/);
    assert.match(href, /family=Rubik/);
    assert.match(href, /family=Heebo/);
  });
});
