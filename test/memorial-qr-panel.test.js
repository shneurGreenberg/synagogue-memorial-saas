const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeMemorialQrPanel,
  memorialQrPanelForBoard,
  memorialQrPanelForAdminEdit,
  parseMemorialQrPanelFromBody,
  MEMORIAL_QR_DEFAULTS,
  DONATION_QR_DEFAULTS,
} = require('../lib/memorial-qr-panel');

describe('memorial-qr-panel', () => {
  it('keeps unified text fields in storage normalization', () => {
    const panel = normalizeMemorialQrPanel({
      titleText: 'Unified title',
      donationTitleText: 'Donate',
    });

    assert.equal(panel.titleText, 'Unified title');
    assert.equal(panel.donationTitleText, 'Donate');
  });

  it('prefills admin edit from legacy triplets without system defaults', () => {
    const panel = memorialQrPanelForAdminEdit({
      titles: { ru: '', en: '', he: 'Legacy HE' },
    }, 'he');
    assert.equal(panel.titleText, 'Legacy HE');
    assert.equal(panel.donationTitles.en, '');
  });

  it('applies defaults for board display when unified and legacy fields are empty', () => {
    const panel = memorialQrPanelForBoard({
      titles: { ru: '', en: '', he: '' },
      texts: { ru: '', en: '', he: '' },
      donationTitles: { ru: 'My donation title', en: '', he: '' },
      donationTexts: { ru: '', en: '', he: '' },
    }, 'ru');

    assert.equal(panel.titleText, MEMORIAL_QR_DEFAULTS.titles.ru);
    assert.equal(panel.donationTitleText, 'My donation title');
    assert.equal(panel.donationTextText, DONATION_QR_DEFAULTS.texts.ru);
  });

  it('parses registration and donation unified fields from admin form body', () => {
    const panel = parseMemorialQrPanelFromBody({
      memorialQrTitle: 'Reg unified',
      memorialQrText: 'Reg body',
      donationQrTitle: 'Don EN',
      donationQrText: 'Don RU',
      memorialQrTitleScale: '110',
    }, {});

    assert.equal(panel.titleText, 'Reg unified');
    assert.equal(panel.textText, 'Reg body');
    assert.equal(panel.donationTitleText, 'Don EN');
    assert.equal(panel.donationTextText, 'Don RU');
    assert.equal(panel.titleScale, 110);
  });
});
