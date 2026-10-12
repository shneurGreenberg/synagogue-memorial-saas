const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function loadAdminCandlePalette() {
  const scriptPath = path.join(__dirname, '..', 'public', 'js', 'candle-palette-browser.js');
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(scriptPath, 'utf8'), sandbox);
  return sandbox.window.AdminCandlePalette;
}

describe('candle-palette-browser', () => {
  it('applies palette CSS variables to a preview element', () => {
    const api = loadAdminCandlePalette();
    const el = { style: { setProperty() {} } };
    const props = [];
    el.style.setProperty = (name, value) => {
      props.push([name, value]);
    };

    api.applyCandlePaletteToElement(el, 'golden');

    assert.ok(props.some(([name]) => name === '--candle-flame-glow'));
    assert.equal(api.normalizeCandlePalette('unknown'), 'classic');
  });
});
