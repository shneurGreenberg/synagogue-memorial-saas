const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { mergePreviewPatch } = require('../lib/board-preview');

describe('board preview font', () => {
  it('applies boardFont and border fields from preview patch', () => {
    const base = {
      theme: { boardFont: 'georgia', fontScales: {} },
      titles: {},
    };

    const next = mergePreviewPatch(base, {
      boardFont: 'heebo',
      panelBorderColor: '#112233',
      panelBorderOpacity: '25',
      panelBorderRadius: '8',
      panelBorderWidth: '4',
      tileBorderColor: '#445566',
      tileBorderOpacity: '75',
      tileBorderRadius: '16',
      tileBorderWidth: '3',
      fontScale_dailyStudy: '120',
      fontScale_hayomYom: '90',
    });

    assert.equal(next.theme.boardFont, 'heebo');
    assert.equal(next.theme.panelBorderColor, '#112233');
    assert.equal(next.theme.panelBorderOpacity, 25);
    assert.equal(next.theme.panelBorderRadius, 8);
    assert.equal(next.theme.tileBorderWidth, 3);
    assert.equal(next.theme.fontScales.dailyStudy, 120);
    assert.equal(next.theme.fontScales.hayomYom, 90);
  });
});
