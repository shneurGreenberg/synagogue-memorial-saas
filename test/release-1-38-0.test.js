const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

describe('1.38.0 I84: even gold + gold styles', () => {
  const unify = require('../lib/board-color-unify');

  it('normalizes the gold style (default subtle) and saves it', () => {
    assert.deepEqual(unify.GOLD_STYLES, ['subtle', 'shiny', 'matte', 'solid']);
    assert.equal(unify.normalizeGoldStyle(undefined), 'subtle');
    assert.equal(unify.normalizeGoldStyle('SHINY'), 'shiny');
    assert.equal(unify.normalizeGoldStyle('bogus'), 'subtle');
    assert.equal(unify.normalizeColorFlags({ goldStyle: 'matte' }).goldStyle, 'matte');
    assert.deepEqual(unify.colorFlagsToUpdate({ goldStyle: 'solid' }), { 'theme.goldStyle': 'solid' });
    assert.equal(unify.applyColorFlagsPatch({}, { goldStyle: 'shiny' }).goldStyle, 'shiny');
    const { buildBoardSettingsUpdate } = require('../lib/admin-board-settings-save');
    const FULL = { settingsAppearance: true, settingsBranding: true, settingsGeneral: true, settingsFeatures: true };
    const u = buildBoardSettingsUpdate({ goldPrimary: '1', goldStyle: 'matte' }, { theme: {} }, FULL);
    assert.equal(u['theme.goldStyle'], 'matte');
  });

  it('gradient is one line tall and repeats per line (no more stretching over the whole block)', () => {
    const css = unify.buildUnifiedColorCss({ theme: { goldPrimary: true, goldText: true }, primary: '#a', text: '#b' });
    assert.match(css, /background-size: 100% 1lh !important/);
    assert.match(css, /background-repeat: repeat-y !important/);
    assert.match(css, /box-decoration-break: clone/);
    assert.match(css, /and \(height: 1lh\)/);
    // the old diagonal gradient stretched over the element is gone
    assert.doesNotMatch(css, /110deg/);
    // fallback for engines without background-clip:text stays a solid colour
    assert.match(css, /cards-grid-kadish \.card \.inner h3 \{\s*color: #d9b04a !important;\s*\}/);
  });

  it('each style renders differently; solid has no gradient at all', () => {
    const build = (goldStyle) => unify.buildUnifiedColorCss({ theme: { goldPrimary: true, goldStyle }, primary: '#a', text: '#b' });
    const subtle = build('subtle');
    const shiny = build('shiny');
    const matte = build('matte');
    const solid = build('solid');
    assert.notEqual(subtle, shiny);
    assert.notEqual(subtle, matte);
    assert.match(shiny, /drop-shadow/);
    assert.doesNotMatch(subtle, /drop-shadow/);
    assert.doesNotMatch(solid, /background-clip/);
    assert.doesNotMatch(solid, /linear-gradient/);
    assert.equal(build(undefined), subtle);
    // TVs (reduceEffects) never get the drop-shadow filter
    const tv = unify.buildUnifiedColorCss({ theme: { goldPrimary: true, goldStyle: 'shiny' }, primary: '#a', text: '#b', reduceEffects: true });
    assert.doesNotMatch(tv, /drop-shadow/);
  });

  it('admin: selector in «מראה» next to the gold switches and in the preview panels', () => {
    const view = read('views/admin/dashboard.handlebars');
    const block = view.slice(view.indexOf('id="settingsUnifiedColors"'), view.indexOf('id="settingsColorGrid"'));
    assert.match(block, /<select name="goldStyle" id="goldStyle"/);
    ['subtle', 'shiny', 'matte', 'solid'].forEach((v) => assert.match(block, new RegExp(`value="${v}"`)));
    assert.match(view, /goldStyle: \(function \(\)/);
    assert.match(view, /'goldClock', 'goldStyle'\]\.forEach/);
    const js = read('public/js/admin-preview-editor.js');
    assert.match(js, /GOLD_TEXT, GOLD_STYLE\]/);
    assert.match(js, /goldStyle: true \}/);
    const { translations } = require('../lib/admin-translations');
    ['he', 'ru', 'en'].forEach((lang) => {
      ['gold_style', 'gold_style_label', 'gold_style_subtle', 'gold_style_shiny', 'gold_style_matte', 'gold_style_solid'].forEach((key) => {
        assert.ok(translations[lang][key], `${lang}.${key}`);
      });
    });
    assert.match(read('models/Synagogue.js'), /goldStyle: \{ type: String, default: 'subtle'/);
    assert.match(read('lib/saved-view-design.js'), /'goldStyle'/);
    assert.match(read('routes/admin.js'), /'theme\.goldStyle': 'subtle'/);
  });
});

describe('1.38.0 I85: long-running TV board stays clean', () => {
  it('no per-candle CSS animation / will-change layers by default; one shared driver', () => {
    const scss = read('styles/_css-candle.scss');
    assert.doesNotMatch(scss, /will-change:/);
    const flameRule = scss.slice(scss.indexOf('.css-candle-flame {'), scss.indexOf('}', scss.indexOf('.css-candle-flame {')));
    assert.doesNotMatch(flameRule, /animation:/);
    assert.match(scss, /\.css-candle-css \.css-candle-flame \{\s*animation: css-candle-flame-sway/);
    const jsx = read('client/src/components/CandleVideo.jsx');
    assert.match(jsx, /registerCandleFlame/);
  });

  it('flicker driver: small poses, pauses when hidden, stops when no candles', async () => {
    const mod = await import('../client/src/lib/candle-flicker.js');
    for (let t = 0; t < 10; t += 0.37) {
      const pose = mod.computeFlamePose(t, 1.2);
      const m = pose.transform.match(/rotate\((-?[\d.]+)deg\) scaleY\(([\d.]+)\)/);
      assert.ok(m, pose.transform);
      assert.ok(Math.abs(Number(m[1])) <= 2.001);
      assert.ok(Number(m[2]) >= 0.94 && Number(m[2]) <= 1);
      assert.ok(Number(pose.opacity) >= 0.9 && Number(pose.opacity) <= 1);
    }
    assert.match(mod.computeFlamePose(1, 0, true).transform, /rotate\(0\.00deg\)/);
    assert.ok(mod.CANDLE_FLICKER_FRAME_MS >= 80);

    const intervals = new Map();
    let nextId = 1;
    const listeners = {};
    global.window = {
      setInterval(fn) { const id = nextId++; intervals.set(id, fn); return id; },
      clearInterval(id) { intervals.delete(id); },
      matchMedia: () => ({ matches: false }),
    };
    global.document = { hidden: false, addEventListener(name, fn) { listeners[name] = fn; } };
    try {
      const el = { isConnected: true, style: {} };
      const off = mod.registerCandleFlame(el);
      assert.deepEqual(mod.candleFlickerState(), { flames: 1, running: true });
      [...intervals.values()][0]();
      assert.match(el.style.transform, /rotate/);
      global.document.hidden = true;
      listeners.visibilitychange();
      assert.equal(mod.candleFlickerState().running, false);
      assert.equal(intervals.size, 0);
      global.document.hidden = false;
      listeners.visibilitychange();
      assert.equal(mod.candleFlickerState().running, true);
      off();
      assert.deepEqual(mod.candleFlickerState(), { flames: 0, running: false });
      assert.equal(intervals.size, 0);
    } finally {
      delete global.window;
      delete global.document;
    }
  });

  it('soft reload safety net: nightly or after 6 h, only at a quiet moment', async () => {
    const m = await import('../client/src/lib/board-soft-reload.js');
    const H = 60 * 60 * 1000;
    assert.equal(m.shouldSoftReload({ uptimeMs: 30 * 60 * 1000, hour: 3 }), false);
    assert.equal(m.shouldSoftReload({ uptimeMs: 2 * H, hour: 3 }), true);
    assert.equal(m.shouldSoftReload({ uptimeMs: 2 * H, hour: 14 }), false);
    assert.equal(m.shouldSoftReload({ uptimeMs: 6 * H, hour: 14 }), true);
    assert.equal(m.shouldSoftReload({ uptimeMs: 7 * H, hour: 14, hidden: true }), false);
    assert.equal(m.shouldSoftReload({ uptimeMs: 7 * H, hour: 14, offline: true }), false);
    assert.equal(m.shouldSoftReload({ uptimeMs: 7 * H, hour: 14, overlayOpen: true }), false);
    assert.equal(m.shouldSoftReload({ uptimeMs: 7 * H, hour: 14, sinceInteractionMs: 30 * 1000 }), false);
    assert.equal(m.softReloadDisabledByUrl('?softReload=0'), true);
    assert.equal(m.softReloadDisabledByUrl('?candle=lite'), false);
    const comp = read('client/src/components/BoardSoftReload.jsx');
    assert.match(comp, /method: 'HEAD'/);
    assert.match(comp, /isBoardPreviewMode\(\)/);
    assert.match(read('client/src/BoardLayout.jsx'), /<BoardSoftReload \/>/);
  });

  it('scrolling loops measure once a second and rest while hidden; header isolated; blur really off', () => {
    const jsx = read('client/src/components/SynagogueInfoPanel.jsx');
    assert.match(jsx, /LOOP_SCROLL_MEASURE_EVERY = 40/);
    const loop = jsx.slice(jsx.indexOf('export function useLoopScroll'), jsx.indexOf('// 1.37.0 I77'));
    const tickBody = loop.slice(loop.indexOf('window.setInterval'));
    assert.match(tickBody, /if \(document\.hidden\) return;/);
    assert.equal((tickBody.match(/getBoundingClientRect/g) || []).length, 0);
    assert.match(read('styles/home.scss'), /\.board-right-header \{\s*position: relative;\s*z-index: 3;\s*isolation: isolate;/);
    assert.match(read('client/src/components/ThemeStyles.jsx'), /backdrop-filter: none !important/);
  });
});

describe('1.38.0 version', () => {
  it('changelog leads with 1.38.0 in three languages', () => {
    const raw = JSON.parse(read('CHANGELOG.json'));
    assert.equal(raw[0].version, '1.38.0');
    raw[0].items.forEach((item) => {
      assert.ok(item.text && item.text_ru && item.text_en);
    });
  });
});
