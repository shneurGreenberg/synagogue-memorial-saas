const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeThemeBorders,
  resolvePanelBorderCss,
  resolveTileBorderCss,
} = require('../lib/theme-borders');

describe('theme-borders', () => {
  it('normalizes panel and tile border colors with opacity', () => {
    const borders = normalizeThemeBorders({
      panelBorderColor: '#112233',
      panelBorderOpacity: 50,
      tileBorderColor: '#aabbcc',
      tileBorderOpacity: 80,
    });

    assert.equal(borders.panelBorderColor, '#112233');
    assert.equal(borders.panelBorderOpacity, 50);
    assert.equal(borders.tileBorderColor, '#aabbcc');
    assert.equal(borders.tileBorderOpacity, 80);
    assert.equal(resolvePanelBorderCss(borders), 'rgba(17, 34, 51, 0.5)');
    assert.equal(resolveTileBorderCss(borders, 'rgba(0, 0, 0, 1)'), 'rgba(170, 187, 204, 0.8)');
  });

  it('normalizes panel and tile border radius and width in px', () => {
    const borders = normalizeThemeBorders({
      panelBorderRadius: '4.6',
      panelBorderWidth: 99,
      tileBorderRadius: -3,
      tileBorderWidth: '2',
    });
    assert.equal(borders.panelBorderRadius, 5);
    assert.equal(borders.panelBorderWidth, 48);
    assert.equal(borders.tileBorderRadius, 0);
    assert.equal(borders.tileBorderWidth, 2);
  });
});
