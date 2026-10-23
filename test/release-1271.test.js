const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const I18N_DIR = path.join(ROOT, 'client', 'src', 'lib', 'i18n-resources');
const BOARD_ASSETS = path.join(ROOT, 'public', 'board', 'assets');
const MEMORIAL_BUNDLE = path.join(BOARD_ASSETS, 'memorial.js');
const JEWISH_PANELS = path.join(ROOT, 'client', 'src', 'components', 'JewishContentPanels.jsx');
const HEBREW_TEHILLIM = 'תהילים';

function readAllFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      readAllFiles(full, acc);
    } else {
      acc.push(full);
    }
  }
  return acc;
}

describe('release 1.27.1 Russian Tehillim section', () => {
  it('ru i18n uses Теилим title without Hebrew sublabel (1.27.2: no Псалмы sublabel)', () => {
    const ru = fs.readFileSync(path.join(I18N_DIR, 'ru.js'), 'utf8');
    assert.match(ru, /daily_tehillim:\s*'Теилим'/);
    assert.match(ru, /daily_tehillim_sublabel:\s*''/);
    assert.doesNotMatch(ru, /daily_tehillim_sublabel:\s*'תהילים'/);
  });

  it('he and en Tehillim i18n unchanged', () => {
    const he = fs.readFileSync(path.join(I18N_DIR, 'he.js'), 'utf8');
    const en = fs.readFileSync(path.join(I18N_DIR, 'en.js'), 'utf8');
    assert.match(he, /daily_tehillim:\s*'תהילים'/);
    assert.match(he, /daily_tehillim_sublabel:\s*''/);
    assert.match(en, /daily_tehillim:\s*'Psalms'/);
    assert.match(en, /daily_tehillim_sublabel:\s*'Tehillim'/);
  });

  it('i18n resources contain no Псалт wording (user-visible copy)', () => {
    const paths = [...readAllFiles(I18N_DIR)];
    for (const filePath of paths) {
      const text = fs.readFileSync(filePath, 'utf8');
      assert.doesNotMatch(text, /Псалт/i, `Псалт found in ${path.relative(ROOT, filePath)}`);
    }
  });

  it('JewishContentPanels ru Tehillim render has no Hebrew תהילים in source', () => {
    const source = fs.readFileSync(JEWISH_PANELS, 'utf8');
    const tehillimBlock = source.slice(source.indexOf("case 'tehillim'"));
    assert.doesNotMatch(tehillimBlock.slice(0, 400), new RegExp(HEBREW_TEHILLIM));
    assert.doesNotMatch(tehillimBlock.slice(0, 400), /uiLang === 'ru'/);
  });
});
