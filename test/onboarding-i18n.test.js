const test = require('node:test');
const assert = require('node:assert');
const {
  resolveOnboardingLang,
  readOnboardingLangCookie,
  getOnboardingTranslator,
} = require('../lib/onboarding-i18n');

test('resolveOnboardingLang prefers query over cookie', () => {
  assert.strictEqual(resolveOnboardingLang('he', 'ru'), 'he');
  assert.strictEqual(resolveOnboardingLang('', 'ru'), 'ru');
  assert.strictEqual(resolveOnboardingLang(undefined, undefined), 'he');
});

test('resolveOnboardingLang defaults to Hebrew without query or cookie', () => {
  assert.strictEqual(resolveOnboardingLang(null, ''), 'he');
  assert.strictEqual(resolveOnboardingLang('   ', undefined), 'he');
});

test('readOnboardingLangCookie parses cookie header', () => {
  const req = { headers: { cookie: 'foo=1; onboarding_lang=ru; bar=2' } };
  assert.strictEqual(readOnboardingLangCookie(req), 'ru');
});

test('onboarding translator returns strings for all supported languages', () => {
  ['en', 'ru', 'he'].forEach((lang) => {
    const t = getOnboardingTranslator(lang);
    assert.ok(t('page_title'));
    assert.ok(t('language_label'));
    assert.ok(t('submit'));
    assert.ok(t('submitting'));
    assert.ok(t('web_address_label'));
  });
});

test('onboarding copy avoids slug terminology', () => {
  const forbidden = [/slug/i, /слаг/i, /סלאג/];
  const keys = [
    'web_address_label', 'web_address_help', 'admin_password_help',
    'error_web_address', 'submitting',
  ];
  ['en', 'ru', 'he'].forEach((lang) => {
    const t = getOnboardingTranslator(lang);
    keys.forEach((key) => {
      const text = t(key);
      forbidden.forEach((pattern) => {
        assert.equal(pattern.test(text), false, `${lang}:${key} => ${text}`);
      });
    });
  });
});

test('Hebrew submitting label matches product copy', () => {
  const t = getOnboardingTranslator('he');
  assert.equal(t('submitting'), 'שולח את הבקשה…');
});
