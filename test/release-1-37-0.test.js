const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

describe('1.37.0 I71: barcode corners rounded on the image itself', () => {
  it('no white frame / padding around the rounded image (modern browsers)', () => {
    const scss = read('styles/home.scss');
    // 1.37.1 I83: same goal for every browser; corners are a px radius set by QrImage.
    const i = scss.indexOf('1.37.1 I83');
    assert.ok(i > 0);
    const block = scss.slice(i, i + 2400);
    assert.match(block, /background-color: transparent;/);
    assert.match(block, /padding: 0 !important/);
    assert.match(block, /background: transparent !important/);
  });
});

describe('1.37.0 I72: clock color is not reset to white', () => {
  it('admin enrich keeps clockColor / shabbatColor', () => {
    const { enrichSynagogueForAdmin } = require('../lib/admin-theme');
    const out = enrichSynagogueForAdmin({ theme: { clockColor: '#123456', shabbatColor: '#654321' } });
    assert.equal(out.theme.clockColor, '#123456');
    assert.equal(out.theme.shabbatColor, '#654321');
    assert.equal(enrichSynagogueForAdmin({ theme: {} }).theme.clockColor, '');
  });
  it('saved designs carry the clock color', () => {
    const { buildDesignApplyUpdate } = require('../lib/saved-view-design');
    const u = buildDesignApplyUpdate({ theme: { clockColor: '#abcdef', unifiedColors: true, goldText: true } });
    assert.equal(u['theme.clockColor'], '#abcdef');
    assert.equal(u['theme.unifiedColors'], true);
    assert.equal(u['theme.goldText'], true);
  });
});

describe('1.37.0 I73: Torah-reading names can be made smaller', () => {
  it('range goes below 100%', () => {
    const { normalizeFontScales, getFontScaleRange } = require('../lib/theme-typography');
    assert.equal(getFontScaleRange('torahNames').min, 30);
    assert.equal(normalizeFontScales({ torahNames: 50 }).torahNames, 50);
    assert.match(read('client/src/lib/theme-typography.js'), /torahNames: \{ min: 30, max: 400 \}/);
    assert.match(read('routes/admin.js'), /key: 'torahNames'[^}]*min: 30/);
  });
});

describe('1.37.0 I74: unified colors + metallic gold', () => {
  const unify = require('../lib/board-color-unify');
  it('flags default off and parse form values', () => {
    assert.deepEqual(unify.normalizeColorFlags({}), {
      unifiedColors: false, goldPrimary: false, goldText: false, goldClock: false, goldStyle: 'subtle',
    });
    assert.deepEqual(unify.colorFlagsToUpdate({ unifiedColors: ['0', '1'], goldText: '0' }), {
      'theme.unifiedColors': true, 'theme.goldText': false,
    });
  });
  it('no extra CSS when everything is off (backward compatible)', () => {
    assert.equal(unify.buildUnifiedColorCss({ theme: {}, primary: '#111111', text: '#222222' }), '');
  });
  it('unified: headings → primary, texts (clock, weather incl. icons) → text', () => {
    const css = unify.buildUnifiedColorCss({ theme: { unifiedColors: true }, primary: '#aa0000', text: '#00bb00' });
    assert.match(css, /--clock-color: #00bb00/);
    assert.match(css, /memorial-submission-qr-header h2[\s\S]*color: #aa0000 !important/);
    assert.match(css, /synagogue-info-title/);
    assert.match(css, /hayom-yom-panel h2/);
    assert.match(css, /memorial-prayer-block h1/);
    assert.match(css, /weather-today-temp[\s\S]*color: #00bb00 !important/);
    assert.match(css, /weather-icon::before \{\s*color: #00bb00 !important/);
  });
  it('gold uses background-clip:text with a solid fallback', () => {
    const css = unify.buildUnifiedColorCss({ theme: { goldPrimary: true }, primary: '#aa0000', text: '#00bb00' });
    assert.match(css, /@supports \(\(-webkit-background-clip: text\) or \(background-clip: text\)\)/);
    assert.match(css, /-webkit-text-fill-color: transparent/);
    assert.match(css, /board-header h1/);
    const unified = unify.buildUnifiedColorCss({ theme: { unifiedColors: true, goldText: true }, primary: '#aa0000', text: '#00bb00' });
    assert.match(unified, /weather-icon::before \{\s*color: #d9b04a/);
  });
  it('saved with settings, admin toggle + labels in 3 languages', () => {
    const { buildBoardSettingsUpdate } = require('../lib/admin-board-settings-save');
    const FULL = { settingsAppearance: true, settingsBranding: true, settingsGeneral: true, settingsFeatures: true };
    const u = buildBoardSettingsUpdate({ unifiedColors: ['0', '1'], goldPrimary: '1', goldText: '0' }, { theme: {} }, FULL);
    assert.equal(u['theme.unifiedColors'], true);
    assert.equal(u['theme.goldPrimary'], true);
    assert.equal(u['theme.goldText'], false);
    const view = read('views/admin/dashboard.handlebars');
    assert.match(view, /id="unifiedColorsToggle"/);
    assert.match(view, /id="goldPrimaryToggle"/);
    assert.match(view, /id="goldTextToggle"/);
    const tr = read('lib/admin-translations.js');
    assert.match(tr, /unified_colors: 'שמור על צבעים אחידים'/);
    assert.match(tr, /unified_colors: 'Единые цвета'/);
    assert.match(tr, /unified_colors: 'Unified colors'/);
    assert.match(tr, /gold_effect: 'אפקט זהב מטאלי'/);
  });
  it('board applies it last and preview passes the flags', () => {
    assert.match(read('client/src/components/ThemeStyles.jsx'), /\$\{unifiedCss\}\n {2}`;/);
    const { mergePreviewPatch } = require('../lib/board-preview');
    const out = mergePreviewPatch({ theme: {} }, { unifiedColors: '1', goldClock: '0' });
    assert.equal(out.theme.unifiedColors, true);
    assert.equal(out.theme.goldClock, false);
  });
});

describe('1.37.0 I75: the logo no longer opens the admin', () => {
  it('no navigation in CommunityLogo', () => {
    const src = read('client/src/components/CommunityLogo.jsx');
    assert.doesNotMatch(src, /\/admin\//);
    assert.doesNotMatch(src, /location\.href/);
    assert.doesNotMatch(src, /onClick/);
  });
});

describe('1.37.0 I76: candle flames move again', () => {
  function load(userAgent, search = '') {
    const sandbox = {
      navigator: { userAgent, hardwareConcurrency: 4 },
      document: { createElement() { return { canPlayType: () => '' }; } },
      requestAnimationFrame() {},
      location: { search },
      URLSearchParams,
    };
    sandbox.window = sandbox;
    const script = read('client/src/lib/legacy-browser.js').replace(/\bexport\s+/g, '');
    vm.runInNewContext(script, sandbox);
    return sandbox;
  }
  it('TVs / no-h264 browsers get the animated lite candle, not a frozen one', () => {
    assert.equal(load('Mozilla/5.0 (Linux; Android 9; BRAVIA 4K) Chrome/74').resolveBoardCandleMode(), 'lite');
    assert.equal(load('Mozilla/5.0 (X11; Linux x86_64) Chrome/120').resolveBoardCandleMode(), 'lite');
    assert.equal(load('Mozilla/5.0 (X11; Linux x86_64) Chrome/120', '?candle=static').resolveBoardCandleMode(), 'static');
  });
  it('reduced-motion keeps a gentle flicker', () => {
    const scss = read('styles/_css-candle.scss');
    assert.match(scss, /@keyframes css-candle-flame-flicker/);
    // 1.38.0 I85: the CSS animation is only used with ?candle=css; the JS driver handles reduce-motion.
    assert.match(scss, /prefers-reduced-motion: reduce\) \{\s*\.css-candle-css \.css-candle-flame[\s\S]*?animation: css-candle-flame-flicker/);
  });
});

describe('1.37.0 I77: prayers and lessons scroll separately', () => {
  const { splitSectionHeights } = require('../lib/split-section-heights');
  it('short part keeps its natural height, the long one gets the rest', () => {
    assert.deepEqual(splitSectionHeights(300, 60, 500), { a: 60, b: 240 });
    assert.deepEqual(splitSectionHeights(300, 500, 80), { a: 220, b: 80 });
    assert.deepEqual(splitSectionHeights(300, 100, 120), { a: 100, b: 120 });
    assert.deepEqual(splitSectionHeights(300, 400, 400), { a: 150, b: 150 });
    assert.deepEqual(splitSectionHeights(300, 0, 400), { a: 0, b: 300 });
  });
  it('lessons heading sits outside the scrolling list', () => {
    const jsx = read('client/src/components/SynagogueInfoPanel.jsx');
    const classes = jsx.slice(jsx.indexOf('synagogue-info-part--classes'));
    assert.ok(classes.indexOf('synagogue-info-group-title') < classes.indexOf('synagogue-info-box-scroll'));
    assert.match(jsx, /useLoopScroll\(classesRef/);
  });
});

describe('1.37.0 I78: Russian zmanim label is explained', () => {
  it('uses «Зманим — галахическое время дня»', () => {
    assert.match(read('client/src/lib/i18n-resources/ru.js'), /zmanim_title: 'Зманим — галахическое время дня'/);
    assert.equal(require('../lib/board-mode').defaultSectionTitles('ru').zmanim, 'Зманим — галахическое время дня');
    assert.doesNotMatch(read('lib/admin-translations.js'), /'Размер текста: зманим'/);
  });
});

describe('1.37.0 I79: official Russian Hayom Yom from ru.chabad.org', () => {
  const ru = require('../lib/chabad-hayom-yom-ru');
  const fixture = (name) => read(`test/fixtures/hayom-yom-ru/${name}`);
  it('extracts the Russian text without footnote numbers, notes or the Hebrew table', () => {
    const out = ru.extractRussianHayomYom(fixture('2021-01-01-tevet-17.html'), { hebrewMonth: 10, isLeapYear: false });
    assert.match(out.text, /^Мой отец объяснил мне/);
    assert.match(out.text, /От учебы воздерживаются лишь до полуночи\.$/);
    assert.doesNotMatch(out.text, /ПРИМЕЧАНИЯ|Рождества|[\u0590-\u05FF]/);
    assert.doesNotMatch(out.text, /нахт",?1/);
    assert.equal(out.variant, '');
  });
  it('regular-year Adar page has both entries; plain Adar = Adar II', () => {
    const html = fixture('2020-03-17-adar-21-nonleap.html');
    const blocks = ru.parseRussianHayomYomBlocks(html);
    assert.deepEqual(blocks.map((b) => b.hebrewDateLabel), ['כא אדר א', 'כא אדר שני']);
    const regular = ru.extractRussianHayomYom(html, { hebrewMonth: 12, isLeapYear: false });
    assert.match(regular.text, /^В заключение вышеизложенной истории \(см\. 20 Адара II\)/);
    assert.equal(regular.variant, 'adar2');
    const leapAdarI = ru.extractRussianHayomYom(html, { hebrewMonth: 12, isLeapYear: true });
    assert.match(leapAdarI.text, /^Понятие "хасид"/);
    assert.equal(leapAdarI.variant, 'adar1');
    const adar3 = ru.extractRussianHayomYom(fixture('2020-02-28-adar-3-nonleap.html'), { hebrewMonth: 12, isLeapYear: false });
    assert.match(adar3.text, /^Одному из хасидов/);
  });
  it('variant rules + placeholder detection', () => {
    assert.equal(ru.expectedAdarVariant(12, false), 'adar2');
    assert.equal(ru.expectedAdarVariant(12, true), 'adar1');
    assert.equal(ru.expectedAdarVariant(13, true), 'adar2');
    assert.equal(ru.expectedAdarVariant(9, false), '');
    assert.equal(ru.isRussianPlaceholder('Этот текст трудно перевести.'), true);
    assert.equal(ru.isRussianPlaceholder('Hard to translate'), true);
    assert.equal(ru.isRussianPlaceholder('Мой отец объяснил мне многое.'), false);
  });
  it('store prefers the official text only when the Adar variant matches', () => {
    const { isOfficialRussian, RU_SOURCE } = require('../lib/hayom-yom-store');
    const entry = { text: { ru: 'Текст' }, russianSource: RU_SOURCE, russianVariant: 'adar2' };
    assert.equal(isOfficialRussian(entry, 12, false), true);
    assert.equal(isOfficialRussian(entry, 12, true), false);
    assert.equal(isOfficialRussian({ text: { ru: 'Текст' }, russianSource: RU_SOURCE, russianVariant: '' }, 9, true), true);
    assert.equal(isOfficialRussian({ text: { ru: 'Текст' }, russianSource: '' }, 9, true), false);
  });
  it('feed exposes the source and keeps the machine translation as fallback', () => {
    const feed = read('lib/jewish-feed.js');
    assert.match(feed, /ensureOfficialRussianHayomYom\(entry, gregorian \|\| date, month, day, isLeapYear\)/);
    assert.match(feed, /source = 'translation'/);
    assert.match(feed, /translateHayomYom\(englishText, month, day, 'ru'\)/);
  });
});
