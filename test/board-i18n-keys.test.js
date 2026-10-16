const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RESOURCE_DIR = path.join(__dirname, '..', 'client', 'src', 'lib', 'i18n-resources');

function keysFromResourceFile(name) {
  const text = fs.readFileSync(path.join(RESOURCE_DIR, `${name}.js`), 'utf8');
  return [...text.matchAll(/^\s{2}([a-z][a-z0-9_]*):/gm)].map((match) => match[1]).sort();
}

describe('invariant: board i18n keys (he/ru/en)', () => {
  it('he keys are covered by ru and en (ru may add transliteration extras)', () => {
    const enKeys = new Set(keysFromResourceFile('en'));
    const ruKeys = new Set(keysFromResourceFile('ru'));
    const heKeys = keysFromResourceFile('he');
    heKeys.forEach((key) => {
      assert.ok(ruKeys.has(key), `ru missing ${key}`);
      assert.ok(enKeys.has(key), `en missing ${key}`);
    });
    ruKeys.forEach((key) => assert.ok(enKeys.has(key), `en missing ${key}`));
  });

  it('admin translators expose core keys in all languages', () => {
    const { getTranslator } = require('../lib/admin-translations');
    ['he', 'ru', 'en'].forEach((lang) => {
      const t = getTranslator(lang);
      assert.ok(t('settings'));
      assert.ok(t('admin_wrong_community_title'));
    });
  });
});
