const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('1.37.1 A: unified colors + gold are reachable from the preview editor', () => {
  const js = read('public/js/admin-preview-editor.js');
  it('every colour panel offers the toggle and gold options', () => {
    assert.match(js, /var MAIN_COLORS = \[UNIFIED, 'primaryColor', GOLD_PRIMARY, 'textColor', GOLD_TEXT, GOLD_STYLE\]/);
    assert.match(js, /fields: \['clockColor', GOLD_CLOCK\]\.concat\(MAIN_COLORS/);
    assert.match(js, /fields: \['boardTitleText'\]\.concat\(MAIN_COLORS/);
    assert.match(js, /fields: MAIN_COLORS\.concat\(\['tileColor'/);
    assert.match(js, /data-preview-label/);
  });
  it('the toggle and gold checkboxes are never hidden by the preview editor', () => {
    assert.match(js, /KEEP_IN_FORM = \{ boardMode: true, unifiedColorsToggle: true, goldPrimaryToggle: true, goldTextToggle: true, goldClockToggle: true, goldStyle: true \}/);
    const view = read('views/admin/dashboard.handlebars');
    const block = view.slice(view.indexOf('id="settingsUnifiedColors"'), view.indexOf('id="settingsColorGrid"'));
    ['unifiedColorsToggle', 'goldPrimaryToggle', 'goldTextToggle', 'goldClockToggle'].forEach((id) => {
      assert.match(block, new RegExp(`id="${id}"`));
    });
    // gold checkboxes no longer live inside the colour tiles (those are hidden in preview-edit mode)
    assert.doesNotMatch(read('views/partials/admin-settings-color-swatch.handlebars'), /goldName/);
  });
  it('labels in 3 languages', () => {
    const { translations } = require('../lib/admin-translations');
    ['he', 'ru', 'en'].forEach((lang) => {
      ['gold_primary_label', 'gold_text_label', 'gold_clock_label', 'gold_effect_row', 'unified_colors_where'].forEach((key) => {
        assert.ok(translations[lang][key], `${lang}.${key}`);
      });
    });
  });
});

describe('1.37.1 B: no flash of the classic form on refresh', () => {
  it('regular sections are hidden from the first paint until the preview editor runs', () => {
    const view = read('views/admin/dashboard.handlebars');
    assert.ok(view.indexOf('preview-edit-pending') < view.indexOf('<form'));
    assert.match(view, /html\.preview-edit-pending #settingsForm > \.admin-panel:not\(\.settings-preview-panel\)/);
    assert.match(read('public/js/admin-preview-editor.js'), /classList\.remove\('preview-edit-pending'\)/);
  });
});

describe('1.37.1 I80–I82: unified colour roles', () => {
  const unify = require('../lib/board-color-unify');
  const css = unify.buildUnifiedColorCss({ theme: { unifiedColors: true }, primary: '#aa0000', text: '#00bb00' });
  const ruleFor = (sel) => {
    const blocks = css.split('}');
    const hit = blocks.find((b) => b.split('{')[0].split(',').map((s) => s.trim()).some((s) => s.endsWith(sel)));
    return hit || '';
  };
  it('I80: subtitle uses the text color', () => {
    assert.match(ruleFor('.board-header-subtitle'), /#00bb00/);
    assert.match(css, /--board-subtitle-color: #00bb00/);
  });
  it('I81: parasha name and Shabbat entry/exit headings use the primary color, times stay text', () => {
    assert.match(ruleFor('.shabbat-parsha-name'), /#aa0000/);
    assert.match(ruleFor('.shabbat-label'), /#aa0000/);
    assert.match(ruleFor('.shabbat-time'), /#00bb00/);
  });
  it('I82: headings in the scrolling dates list use the primary color', () => {
    ['.sidebar-holiday-title', '.sidebar-chabad-title', '.community-event-title'].forEach((sel) => {
      assert.match(ruleFor(sel), /#aa0000/, sel);
    });
    assert.match(ruleFor('.community-event-text'), /#00bb00/);
  });
  it('gold follows the new roles; nothing changes when unified is off', () => {
    const gold = unify.buildUnifiedColorCss({ theme: { unifiedColors: true, goldPrimary: true }, primary: '#a', text: '#b' });
    const goldPart = gold.slice(gold.indexOf('gold: primary'));
    assert.match(goldPart, /shabbat-parsha-name/);
    assert.match(goldPart, /sidebar-holiday-title/);
    assert.doesNotMatch(goldPart, /board-header-subtitle/);
    const goldText = unify.buildUnifiedColorCss({ theme: { unifiedColors: true, goldText: true }, primary: '#a', text: '#b' });
    assert.match(goldText.slice(goldText.indexOf('gold: text')), /board-header-subtitle/);
    assert.equal(unify.buildUnifiedColorCss({ theme: {}, primary: '#a', text: '#b' }), '');
    const off = unify.buildUnifiedColorCss({ theme: { goldText: true }, primary: '#a', text: '#b' });
    assert.match(off, /sidebar-holiday-title/); // unchanged behaviour when unified is off
    assert.doesNotMatch(off, /board-header-subtitle/);
  });
});

describe('1.37.1 I83: rounded barcode without a white square on old TVs too', () => {
  it('fits inside the frame keeping the aspect ratio, with a px radius', async () => {
    const { computeQrFit } = await import('../client/src/lib/qr-fit.js');
    assert.deepEqual(computeQrFit({ frameWidth: 120, frameHeight: 120, naturalWidth: 1000, naturalHeight: 1000 }), { width: 120, height: 120, radius: 8 });
    const wide = computeQrFit({ frameWidth: 120, frameHeight: 120, naturalWidth: 400, naturalHeight: 200 });
    assert.deepEqual(wide, { width: 120, height: 60, radius: 4 });
    assert.deepEqual(computeQrFit({ frameWidth: 100, frameHeight: 100, naturalWidth: 0, naturalHeight: 0 }), { width: 100, height: 100, radius: 7 });
    assert.equal(computeQrFit({ frameWidth: 0, frameHeight: 100, naturalWidth: 10, naturalHeight: 10 }), null);
  });
  it('both QR panels use QrImage and the CSS has no aspect-ratio gate / clip-path', () => {
    assert.match(read('client/src/components/DonationQrPanel.jsx'), /<QrImage /);
    assert.match(read('client/src/components/MemorialSubmissionPanel.jsx'), /<QrImage /);
    const scss = read('styles/home.scss');
    const block = scss.slice(scss.indexOf('1.37.1 I83'), scss.indexOf('1.36.0 I69'));
    assert.match(block, /background-color: transparent;/);
    assert.doesNotMatch(block, /round 7%/);
    assert.doesNotMatch(block, /border-radius: 0 !important/);
  });
});
