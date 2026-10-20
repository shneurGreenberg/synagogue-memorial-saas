const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildBoardSettingsUpdate } = require('../lib/admin-board-settings-save');
const { FULL_ADMIN_PERMISSIONS } = require('../lib/admin-users');

describe('admin board settings save merge', () => {
  const synagogue = {
    boardTitleText: 'Main title',
    boardSubtitle: { enabled: false, text: 'Old subtitle' },
    theme: {
      primaryColor: '#111111',
      textColor: '#222222',
      accentColor: '#333333',
      tileColor: '#444444',
      tileOpacity: 80,
      fontScales: { boardHeader: 110, tileTitle: 95 },
    },
    memorialQrPanel: {
      titleScale: 120,
      textScale: 105,
      qrScale: 150,
    },
    boardFeatures: { weather: true, izkor: false },
    language: 'he',
  };

  it('updates only subtitle fields when subtitle payload is present', () => {
    const update = buildBoardSettingsUpdate({
      boardSubtitleEnabled: '1',
      boardSubtitleText: 'New subtitle',
    }, synagogue, FULL_ADMIN_PERMISSIONS);

    assert.equal(update['boardSubtitle.enabled'], true);
    assert.equal(update['boardSubtitle.text'], 'New subtitle');
    assert.equal(update['theme.primaryColor'], undefined);
    assert.equal(update.boardTitleText, undefined);
    assert.equal(update['memorialQrPanel.titleScale'], undefined);
  });

  it('does not reset board features when features section is absent', () => {
    const update = buildBoardSettingsUpdate({
      boardSubtitleText: 'Only subtitle',
    }, synagogue, FULL_ADMIN_PERMISSIONS);

    assert.equal(update['boardFeatures.weather'], undefined);
  });

  it('applies feature toggles when boardFeaturesSection is submitted', () => {
    const update = buildBoardSettingsUpdate({
      boardFeaturesSection: '1',
      feature_weather: '1',
    }, synagogue, FULL_ADMIN_PERMISSIONS);

    assert.equal(update['boardFeatures.weather'], true);
    assert.equal(update['boardFeatures.izkor'], false);
  });

  it('preserves memorial QR scales when scale fields are omitted', () => {
    const update = buildBoardSettingsUpdate({
      memorialQrTitle: 'QR title',
    }, synagogue, FULL_ADMIN_PERMISSIONS);

    assert.equal(update['memorialQrPanel.titleText'], 'QR title');
    assert.equal(update['memorialQrPanel.titleScale'], 120);
    assert.equal(update['memorialQrPanel.textScale'], 105);
    assert.equal(update['memorialQrPanel.qrScale'], 150);
  });
});
