const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeMemorialQrPanel,
  memorialQrPanelForBoard,
  parseMemorialQrPanelFromBody,
  MEMORIAL_QR_DEFAULTS,
  DONATION_QR_DEFAULTS,
} = require('../lib/memorial-qr-panel');

describe('memorial-qr-panel', () => {
  it('keeps empty custom strings in storage normalization', () => {
    const panel = normalizeMemorialQrPanel({
      titles: { ru: '', en: 'Custom', he: '' },
      texts: { ru: '', en: '', he: '' },
    });

    assert.equal(panel.titles.ru, '');
    assert.equal(panel.titles.en, 'Custom');
    assert.equal(panel.donationTitles.ru, '');
  });

  it('applies defaults for board display when fields are empty', () => {
    const panel = memorialQrPanelForBoard({
      titles: { ru: '', en: '', he: '' },
      texts: { ru: '', en: '', he: '' },
      donationTitles: { ru: 'My donation title', en: '', he: '' },
      donationTexts: { ru: '', en: '', he: '' },
    });

    assert.equal(panel.titles.ru, MEMORIAL_QR_DEFAULTS.titles.ru);
    assert.equal(panel.donationTitles.ru, 'My donation title');
    assert.equal(panel.donationTexts.en, DONATION_QR_DEFAULTS.texts.en);
  });

  it('parses registration and donation text fields from admin form body', () => {
    const panel = parseMemorialQrPanelFromBody({
      memorialQrTitleRu: 'Reg RU',
      memorialQrTextHe: 'Reg HE',
      donationQrTitleEn: 'Don EN',
      donationQrTextRu: 'Don RU',
      memorialQrTitleScale: '110',
    }, {});

    assert.equal(panel.titles.ru, 'Reg RU');
    assert.equal(panel.texts.he, 'Reg HE');
    assert.equal(panel.donationTitles.en, 'Don EN');
    assert.equal(panel.donationTexts.ru, 'Don RU');
    assert.equal(panel.titleScale, 110);
  });
});
