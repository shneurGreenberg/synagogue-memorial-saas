const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  pickDesignFromSnapshot,
  buildDesignApplyUpdate,
} = require('../lib/saved-view-design');
const { stripCommunityBrandingFromSnapshot } = require('../lib/saved-view-branding');

describe('saved-view design whitelist', () => {
  const richSnapshot = {
    titles: { ru: 'Imported title', en: 'EN', he: 'HE' },
    language: 'en',
    shabbatTimesEnabled: true,
    boardFeatures: { weather: false, izkor: true },
    publicSubmission: {
      enabled: true,
      donationUrl: 'https://imported.example/donate',
      donationQrImage: 'donate.png',
      showDonationQr: true,
    },
    theme: {
      logo: 'logo.png',
      primaryColor: '#112233',
      textColor: '#aabbcc',
      fontScales: { tileTitle: 110 },
      logoBorderRadius: 50,
      backgroundImage: 'bg.jpg',
    },
    memorialQrPanel: {
      titles: { ru: 'QR title' },
      donationTitles: { en: 'Donate' },
      titleScale: 120,
      textScale: 90,
      qrScale: 150,
    },
  };

  it('keeps only visual design fields', () => {
    const design = pickDesignFromSnapshot(richSnapshot);
    assert.equal(design.titles, undefined);
    assert.equal(design.language, undefined);
    assert.equal(design.boardFeatures, undefined);
    assert.equal(design.publicSubmission, undefined);
    assert.equal(design.theme.logo, undefined);
    assert.equal(design.theme.primaryColor, '#112233');
    assert.equal(design.memorialQrPanel.titleScale, 120);
    assert.equal(design.memorialQrPanel.titles, undefined);
    assert.equal(design.memorialQrPanel.donationTitles, undefined);
  });

  it('carries border radius and width in design whitelist', () => {
    const design = pickDesignFromSnapshot({
      theme: {
        primaryColor: '#112233',
        panelBorderRadius: 6,
        panelBorderWidth: 5,
        tileBorderRadius: 10,
        tileBorderWidth: 2,
      },
    });
    assert.equal(design.theme.panelBorderRadius, 6);
    assert.equal(design.theme.tileBorderWidth, 2);

    const update = buildDesignApplyUpdate({
      theme: {
        panelBorderColor: '#112233',
        panelBorderRadius: 6,
        panelBorderWidth: 5,
        tileBorderRadius: 10,
        tileBorderWidth: 2,
      },
    });
    assert.equal(update['theme.panelBorderRadius'], 6);
    assert.equal(update['theme.panelBorderWidth'], 5);
    assert.equal(update['theme.tileBorderRadius'], 10);
    assert.equal(update['theme.tileBorderWidth'], 2);
  });

  it('apply update touches theme and QR scales only', () => {
    const update = buildDesignApplyUpdate(richSnapshot);
    assert.equal(update['titles.ru'], undefined);
    assert.equal(update.language, undefined);
    assert.equal(update['boardFeatures.weather'], undefined);
    assert.equal(update['publicSubmission.enabled'], undefined);
    assert.equal(update['theme.primaryColor'], '#112233');
    assert.equal(update['memorialQrPanel.titleScale'], 120);
    assert.equal(update['memorialQrPanel.titles.ru'], undefined);
  });

  it('stripCommunityBrandingFromSnapshot matches design picker', () => {
    assert.deepEqual(
      stripCommunityBrandingFromSnapshot(richSnapshot),
      pickDesignFromSnapshot(richSnapshot),
    );
  });
});
