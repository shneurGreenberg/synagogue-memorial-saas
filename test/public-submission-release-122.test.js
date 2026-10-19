const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { getPublicSubmissionTranslator } = require('../lib/public-submission-i18n');
const { buildPublicBoardThemeCss } = require('../lib/public-board-theme');
const { formatPhoneE164, parsePhoneE164, resolvePhoneFromBody } = require('../lib/public-submission-phone');
const { combineDeceasedDisplayName } = require('../lib/public-deceased-name');
const {
  formatDeceasedCardBadge,
  formatPublicSubmitLabel,
} = require('../lib/public-add-name-labels');
const { parseDeceasedEntriesFromBody } = require('../lib/public-submission-form');

const SUCCESS_VIEW = path.join(__dirname, '..', 'views', 'public', 'add-name-success.handlebars');

describe('release 1.22 public submission', () => {
  it('Z1 thank-you copy describes admin approval (he/ru/en)', () => {
    for (const lang of ['he', 'ru', 'en']) {
      const t = getPublicSubmissionTranslator(lang);
      const message = t('request_success_message');
      assert.match(message, /approval|אישור|одобр/i);
      assert.doesNotMatch(message, /already appears|כבר מופיע|уже.*доск/i);
    }
  });

  it('Z2 thank-you has no board link or add-another actions', () => {
    const html = fs.readFileSync(SUCCESS_VIEW, 'utf8');
    assert.doesNotMatch(html, /back_to_board|success_add_another|boardUrl/);
    assert.match(html, /public-share-icon-btn/);
    assert.match(html, /success_share_aria/);
    assert.match(html, /charity_title/);
  });

  it('Z3 theme CSS uses community colors with tenant isolation', () => {
    const cssA = buildPublicBoardThemeCss({
      theme: { primaryColor: '#aabbcc', textColor: '#111111', accentColor: '#222222', tileColor: '#333333' },
    });
    const cssB = buildPublicBoardThemeCss({
      theme: { primaryColor: '#ddeeff', textColor: '#444444', accentColor: '#555555', tileColor: '#666666' },
    });
    assert.match(cssA, /--primary-color:\s*#aabbcc/);
    assert.match(cssB, /--primary-color:\s*#ddeeff/);
    assert.doesNotMatch(cssA, /#ddeeff/);
    assert.doesNotMatch(cssB, /#aabbcc/);
  });

  it('Z4 saves contact phone as E.164', () => {
    assert.equal(formatPhoneE164('+972', '0501234567'), '+9720501234567');
    assert.equal(resolvePhoneFromBody({
      contactPhoneDial: '+7',
      contactPhoneNational: '9001234567',
    }), '+79001234567');
    const parsed = parsePhoneE164('+380501234567');
    assert.equal(parsed.dial, '+380');
    assert.equal(parsed.e164, '+380501234567');
  });

  it('Z15 deceased badges and multi submit labels (he/ru/en)', () => {
    assert.equal(formatDeceasedCardBadge('he', 1), 'נפטר/ת 1');
    assert.equal(formatDeceasedCardBadge('he', 2), 'נפטר/ת 2');
    assert.equal(formatDeceasedCardBadge('ru', 1), 'Усопший 1');
    assert.equal(formatDeceasedCardBadge('en', 2), 'Deceased 2');
    assert.equal(formatPublicSubmitLabel('he', 1), 'שליחת בקשה');
    assert.equal(formatPublicSubmitLabel('he', 2), 'שליחת בקשה (2 נפטרים)');
    assert.equal(formatPublicSubmitLabel('ru', 3), 'Отправить заявку (3 усопших)');
    assert.equal(formatPublicSubmitLabel('en', 2), 'Send request (2 deceased)');
  });

  it('Z6 combines surname and first name on save', () => {
    assert.equal(combineDeceasedDisplayName('Cohen', 'David'), 'Cohen David');
    const entries = parseDeceasedEntriesFromBody({
      lang: 'he',
      deceased: {
        0: {
          surname: 'כהן',
          firstName: 'דוד',
          fatherName: 'אברהם',
          relationKey: 'ben',
          deceasedGender: 'male',
          deathDate: '01.01.2020',
          diedAfterSunset: 'before',
        },
      },
    });
    assert.equal(entries[0].name, 'כהן דוד');
  });
});
