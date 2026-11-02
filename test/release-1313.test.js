'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const Hebcal = require('hebcal');
const { hebrewDeathToGregorian, parseHebrewDeathFields, parseDeathDateMode, isHebrewLeapYear } = require('../lib/hebrew-death-input');
const { computeHebrewDateOfDeath } = require('../lib/person-hebrew-death');
const { isYahrzeitOnDate } = require('../lib/yahrzeit');
const { RELATION_KEYS, getRelationOptions } = require('../lib/submission-relation');
const { translations } = require('../lib/admin-translations');
const { ADMIN_MANIFEST, SERVICE_WORKER_JS } = require('../lib/admin-pwa');

test('I29: relation list has father-in-law / mother-in-law in every language', () => {
  assert.ok(RELATION_KEYS.includes('cham'));
  assert.ok(RELATION_KEYS.includes('chamot'));
  const he = getRelationOptions('he').map((o) => o.label);
  assert.ok(he.includes('חמי') && he.includes('חמותי'));
  assert.ok(getRelationOptions('en').some((o) => o.label === 'father-in-law'));
  assert.ok(getRelationOptions('en').some((o) => o.label === 'mother-in-law'));
  assert.ok(getRelationOptions('ru').every((o) => o.label && o.label !== o.value));
});

test('I31(2): Hebrew date converts to the daytime Gregorian date', () => {
  // 15 Shevat 5784 = 25 Jan 2024
  assert.deepStrictEqual(hebrewDeathToGregorian(15, 11, 5784).gregorian, { month: 1, date: 25, year: 2024 });
  // 1 Tishrei 5785 = 3 Oct 2024
  assert.deepStrictEqual(hebrewDeathToGregorian(1, 7, 5785).gregorian, { month: 10, date: 3, year: 2024 });
  // Leap year 5784: 14 Adar I = 23 Feb 2024, 14 Adar II = 24 Mar 2024
  assert.ok(isHebrewLeapYear(5784));
  assert.deepStrictEqual(hebrewDeathToGregorian(14, 12, 5784).gregorian, { month: 2, date: 23, year: 2024 });
  assert.deepStrictEqual(hebrewDeathToGregorian(14, 13, 5784).gregorian, { month: 3, date: 24, year: 2024 });
  // Non-leap 5785: Adar II falls back to Adar (14 Adar 5785 = 14 Mar 2025)
  assert.ok(!isHebrewLeapYear(5785));
  assert.deepStrictEqual(hebrewDeathToGregorian(14, 13, 5785).gregorian, { month: 3, date: 14, year: 2025 });
});

test('I31(2): invalid / partial Hebrew dates are rejected, empty is null', () => {
  assert.strictEqual(hebrewDeathToGregorian(30, 2, 5785), null); // Iyar has 29 days
  assert.strictEqual(hebrewDeathToGregorian(0, 7, 5785), null);
  assert.strictEqual(parseHebrewDeathFields('', '', ''), null);
  assert.throws(() => parseHebrewDeathFields('5', '', '5785'), { code: 'incomplete_death_date' });
  assert.strictEqual(parseDeathDateMode('hebrew'), 'hebrew');
  assert.strictEqual(parseDeathDateMode(undefined), 'gregorian');
});

test('I31(2): stored with diedAfterSunset=false the Hebrew date round-trips and yahrzeit lands on it', () => {
  const samples = [[15, 11, 5784], [1, 7, 5785], [14, 12, 5784], [14, 13, 5784], [29, 6, 5780], [10, 10, 5770]];
  for (const [d, m, y] of samples) {
    const { gregorian } = hebrewDeathToGregorian(d, m, y);
    const hebrew = computeHebrewDateOfDeath(gregorian, { diedAfterSunset: false });
    assert.deepStrictEqual(hebrew, { month: m, date: d, year: y });
    const person = { gregorianDateOfDeath: gregorian, diedAfterSunset: false, hebrewDateOfDeath: hebrew };
    // Next year's yahrzeit for regular months
    if (m !== 12 && m !== 13) {
      const next = new Hebcal.HDate(d, m, y + 1).greg();
      assert.ok(isYahrzeitOnDate(person, next, { includeGregorianYahrzeit: false }), `${d}/${m}/${y}`);
      const dayBefore = new Date(next.getTime());
      dayBefore.setDate(dayBefore.getDate() - 1);
      assert.ok(!isYahrzeitOnDate(person, dayBefore, { includeGregorianYahrzeit: false }));
    }
  }
});

test('I31(2): admin form has Hebrew/Gregorian modes and route ignores sunset in Hebrew mode', () => {
  const partial = fs.readFileSync(path.join(__dirname, '../views/partials/admin-death-date-fields.handlebars'), 'utf8');
  assert.match(partial, /name="deathDateMode" value="hebrew"/);
  assert.match(partial, /name="hebrewMonth"/);
  assert.match(partial, /value="13">\{\{t 'hm_13'\}\}/);
  const route = fs.readFileSync(path.join(__dirname, '../routes/admin.js'), 'utf8');
  assert.match(route, /req\.body\.diedAfterSunset = 'before'/);
});

test('translations: new admin keys exist in he/ru/en', () => {
  for (const key of ['death_mode_hebrew', 'hm_13', 'person_detail_section', 'bg_middle_label', 'detail_notes']) {
    for (const lang of ['he', 'ru', 'en']) {
      assert.ok(translations[lang][key], `${lang}.${key}`);
    }
  }
});

test('I31(1): admin PWA manifest and network-only service worker', () => {
  assert.strictEqual(ADMIN_MANIFEST.scope, '/admin/');
  assert.strictEqual(ADMIN_MANIFEST.display, 'standalone');
  assert.ok(ADMIN_MANIFEST.icons.some((i) => i.sizes === '512x512'));
  for (const icon of ADMIN_MANIFEST.icons) {
    assert.ok(fs.existsSync(path.join(__dirname, '..', icon.src)), icon.src);
  }
  assert.match(SERVICE_WORKER_JS, /req\.mode !== 'navigate'/);
  assert.doesNotMatch(SERVICE_WORKER_JS, /cache\.put|\.put\(/);
});

test('I30: middle background is rendered on the board only when set', () => {
  const css = fs.readFileSync(path.join(__dirname, '../client/src/components/ThemeStyles.jsx'), 'utf8');
  assert.match(css, /theme\.middleBackground \?/);
  const editor = fs.readFileSync(path.join(__dirname, '../public/js/admin-preview-editor.js'), 'utf8');
  assert.match(editor, /settings-media-tile--bg-middle/);
});
