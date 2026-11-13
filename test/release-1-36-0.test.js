const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('1.36.0 I61: Rambam sub-label spacing', () => {
  it('sub-label has a real margin (old TVs ignore flex gap)', () => {
    const scss = read('styles/home.scss');
    const block = scss.slice(scss.indexOf('.daily-gate-sublabel {'), scss.indexOf('.daily-gate-value {'));
    assert.match(block, /margin: 0 0\.45em;/);
  });
  it('rambam tiles still render label + sublabel', () => {
    const src = read('client/src/components/JewishContentPanels.jsx');
    assert.match(src, /daily_rambam_three/);
    assert.match(src, /daily-gate-sublabel/);
  });
});

describe('1.36.0 I62/I63: reorderable prayers and lessons with sub-headings', () => {
  const { normalizePrayerTimes, parsePrayerTimesFromBody, prayerTimeRowsForAdmin } = require('../lib/board-mode');

  it('keeps the saved order inside each group (prayers first, then lessons)', () => {
    const rows = normalizePrayerTimes([
      { label: 'Maariv', time: '19:00', kind: 'prayer' },
      { label: 'Gemara', time: '20:00', kind: 'class' },
      { label: 'Shacharit', time: '08:00', kind: 'prayer' },
      { label: 'Tanya', time: '07:00', kind: 'class' },
    ]);
    assert.deepEqual(rows.map((r) => r.label), ['Maariv', 'Shacharit', 'Gemara', 'Tanya']);
  });

  it('sub-headings keep their place among lessons and need no time', () => {
    const rows = parsePrayerTimesFromBody({
      prayerKind_0: 'class', prayerLabel_0: 'Every day', prayerTime_0: '07:00',
      prayerKind_1: 'heading', prayerLabel_1: 'יום שני',
      prayerKind_2: 'class', prayerLabel_2: 'גמרא', prayerTime_2: '20:00',
      prayerKind_3: 'prayer', prayerLabel_3: 'שחרית', prayerTime_3: '8:15',
      prayerKind_4: 'heading', prayerLabel_4: '   ',
    });
    assert.deepEqual(rows, [
      { label: 'שחרית', time: '08:15', kind: 'prayer' },
      { label: 'Every day', time: '07:00', kind: 'class' },
      { label: 'יום שני', time: '', kind: 'heading' },
      { label: 'גמרא', time: '20:00', kind: 'class' },
    ]);
  });

  it('unknown kinds fall back to prayer; rows without time are still dropped', () => {
    const rows = normalizePrayerTimes([{ label: 'x', time: '', kind: 'class' }, { label: 'y', time: '10:00', kind: 'weird' }]);
    assert.deepEqual(rows, [{ label: 'y', time: '10:00', kind: 'prayer' }]);
  });

  it('admin rows flag headings and put them in the lessons list', () => {
    const rows = prayerTimeRowsForAdmin({ language: 'he', prayerTimes: [
      { label: 'שחרית', time: '08:00', kind: 'prayer' },
      { label: 'ראשון', time: '', kind: 'heading' },
      { label: 'חומש', time: '21:00', kind: 'class' },
    ] });
    assert.deepEqual(rows.map((r) => [r.kind, r.isClass, r.isHeading]), [
      ['prayer', false, false], ['heading', true, true], ['class', true, false],
    ]);
  });

  it('model accepts the heading kind', () => {
    assert.match(read('models/Synagogue.js'), /enum: \['prayer', 'class', 'heading'\]/);
  });

  it('admin editor has drag handles, ▲/▼ and an add-sub-heading button; JS uses pointer events', () => {
    const view = read('views/admin/events.handlebars');
    const row = read('views/partials/admin-prayer-row.handlebars');
    const js = read('public/js/admin-content-tabs.js');
    assert.match(view, /data-add-kind="heading"/);
    assert.match(view, /prayerRowTemplate-heading/);
    assert.match(row, /prayer-row-handle/);
    assert.match(row, /prayer-row-up/);
    assert.match(row, /prayer-row-down/);
    assert.match(js, /pointerdown/);
    assert.match(js, /window\.addEventListener\('pointermove'/);
    assert.match(read('styles/admin.scss'), /touch-action: none/);
  });

  it('board renders sub-headings in the lessons list in the heading colour', () => {
    const src = read('client/src/components/SynagogueInfoPanel.jsx');
    assert.match(src, /synagogue-info-subheading/);
    assert.match(src, /row\.kind === 'heading'/);
    const scss = read('styles/home.scss');
    const block = scss.slice(scss.indexOf('.main-container .synagogue-info-prayers .synagogue-info-subheading {'));
    assert.match(block.slice(0, 400), /color: var\(--accent-color/);
  });

  it('translations exist in he/ru/en', () => {
    const { translations } = require('../lib/admin-translations');
    for (const lang of ['he', 'ru', 'en']) {
      for (const key of ['add_class_heading', 'class_heading_label', 'prayer_drag_handle', 'prayer_reorder_hint']) {
        assert.ok(translations[lang][key], `${lang}.${key}`);
      }
    }
  });
});

describe('1.36.0 I65: rounded barcode corners only where safe', () => {
  it('rounding sits behind @supports so old TV WebViews keep the square QR', () => {
    const scss = read('styles/home.scss');
    const i = scss.indexOf('@supports (aspect-ratio: 1 / 1)');
    assert.ok(i > 0);
    assert.match(scss.slice(i, i + 2000), /memorial-submission-qr[\s\S]*border-radius: 7% !important/);
  });
});

describe('1.36.0 I66: combined board large tile for a single yahrzeit', () => {
  it('one yahrzeit today → centre tile + 4 side tiles; several → normal grid', async () => {
    const { combinedFeaturedLayout } = await import('../client/src/lib/zmanim.js');
    const p = (id, extra = {}) => ({ id, ...extra });
    const one = combinedFeaturedLayout([p(1, { passedToday: true }), p(2, { isPermanent: true }), p(3), p(4), p(5), p(6)], 8);
    assert.equal(one.center.id, 1);
    assert.deepEqual(one.sides.map((x) => x && x.id), [2, 3, 4, 5]);
    assert.equal(combinedFeaturedLayout([p(1, { passedToday: true }), p(2, { passedToday: true })], 8), null);
    assert.equal(combinedFeaturedLayout([p(1), p(2)], 8), null);
    const few = combinedFeaturedLayout([p(1, { passedToday: true }), p(2)], 8);
    assert.deepEqual(few.sides.map((x) => x && x.id), [2, undefined, undefined, undefined]);
  });
  it('HomePage renders the featured combined grid with a big card', () => {
    const src = read('client/src/pages/HomePage.jsx');
    assert.match(src, /combinedFeaturedLayout\(this\.state\.allPeople/);
    assert.match(src, /cards-grid-combined-featured/);
    assert.match(read('styles/home.scss'), /\.combined-center \{ grid-column: 2 \/ span 2; grid-row: 1 \/ span 2;/);
  });
});

describe('1.36.0 I67: admin add-deceased builds the name like the public form', () => {
  const { buildDeceasedBoardNameFromAdminForm } = require('../lib/admin-deceased-name');
  it('adds בן/בת or бен/бат from the gender choice', () => {
    assert.deepEqual(buildDeceasedBoardNameFromAdminForm({ name: 'משה כהן', fatherName: 'אברהם', gender: 'male' }, 'he'), { name: 'משה כהן בן אברהם', gender: 'male' });
    assert.deepEqual(buildDeceasedBoardNameFromAdminForm({ name: 'Коган Сара', fatherName: 'Моше', gender: 'female' }, 'ru'), { name: 'Коган Сара бат Моше', gender: 'female' });
  });
  it('without a father name the name is kept as typed', () => {
    assert.deepEqual(buildDeceasedBoardNameFromAdminForm({ name: 'Иван Петрович', gender: 'male' }, 'ru'), { name: 'Иван Петрович', gender: '' });
  });
  it('no gender chosen → inferred from the name, default male; a typed prefix is not doubled', () => {
    assert.equal(buildDeceasedBoardNameFromAdminForm({ name: 'Софья', fatherName: 'Рувима', gender: 'unknown' }, 'ru').name, 'Софья бат Рувима');
    assert.equal(buildDeceasedBoardNameFromAdminForm({ name: 'בן כהן', fatherName: 'דוד', gender: '' }, 'he').gender, 'male');
  });
  it('admin form has separate father field + live preview script', () => {
    const view = read('views/admin/people.handlebars');
    assert.match(view, /name="fatherName" id="addFatherName"/);
    assert.match(view, /data-deceased-name-preview/);
    assert.match(read('routes/admin.js'), /buildDeceasedBoardNameFromAdminForm\(req\.body/);
    assert.match(read('routes/admin.js'), /'admin-deceased-name\.js'/);
  });
});

describe('1.36.0 I68: permanent frame follows the tile corners', () => {
  it('no square outline; ring is a box-shadow that beats the theme rule', () => {
    const scss = read('styles/home.scss');
    const i = scss.indexOf('/* 1.29: permanent deceased frame');
    const block = scss.slice(i, scss.indexOf('.card-permanent-mark {', i));
    assert.match(block, /\.main-container \.cards-grid \.card\.card-permanent/);
    assert.match(block, /outline: none !important/);
    assert.match(block, /border-radius: var\(--tile-border-radius, 12px\) !important/);
    assert.match(block, /0 0 0 4px rgba\(212, 175, 55, 0\.85\)/);
    assert.doesNotMatch(block, /outline-offset/);
  });
});

describe('1.36.0 I69: space between the zmanim and prayer boxes', () => {
  it('side-by-side boxes get a margin with a px fallback', () => {
    const scss = read('styles/home.scss');
    assert.match(scss, /\.synagogue-info-col--side-by-side > \.synagogue-info-block \+ \.synagogue-info-block \{\s*-webkit-margin-start: 10px;\s*margin-inline-start: 10px;/);
  });
});

describe('1.36.0 I70: admin colour picker sliders match their gradients', () => {
  function loadPicker() {
    const listeners = {};
    const sandbox = {
      window: { addEventListener() {}, matchMedia: () => ({ matches: false }) },
      document: {
        documentElement: { getAttribute: () => 'he' },
        addEventListener: (t, fn) => { listeners[t] = fn; },
      },
    };
    sandbox.window.window = sandbox.window;
    vm.runInNewContext(read('public/js/admin-color-picker.js'), sandbox);
    return sandbox.window.adminColorPickerMath;
  }
  it('every slider and its gradient run left → right (min left, max right), in RTL too', () => {
    const m = loadPicker();
    const g = m.trackGradients({ h: 0, s: 100, v: 100 });
    assert.match(g.val, /^linear-gradient\(to right, #000000, #ff0000\)$/);
    assert.match(g.sat, /^linear-gradient\(to right, #ffffff, #ff0000\)$/);
    assert.match(g.hue, /^linear-gradient\(to right, #ff0000,/);
    const js = read('public/js/admin-color-picker.js');
    assert.match(js, /type="range" dir="ltr"/);
    assert.match(js, /pop\.setAttribute\('dir', 'ltr'\)/);
  });
  it('hex ↔ hsv round-trips', () => {
    const m = loadPicker();
    for (const hex of ['#cfaf1f', '#000000', '#ffffff', '#123456', '#ffd54f']) {
      assert.equal(m.rgbToHex(m.hsvToRgb(m.rgbToHsv(m.hexToRgb(hex)))), hex);
    }
  });
  it('is loaded on every admin page', () => {
    assert.match(read('views/layouts/admin.handlebars'), /admin-color-picker\.js/);
  });
});

describe('1.36.0 I64: ben/bat normaliser (dry-run by default)', () => {
  const { proposeBenBat } = require('../lib/normalize-ben-bat');
  it('сын/дочь → бен/бат and fills gender', () => {
    assert.deepEqual(
      (({ newName, newGender, rule }) => ({ newName, newGender, rule }))(proposeBenBat({ name: 'Брегман Софья дочь Рувима' })),
      { newName: 'Брегман Софья бат Рувима', newGender: 'female', rule: 'дочь→бат' },
    );
    assert.equal(proposeBenBat({ name: 'Иван СЫН Петра', gender: 'male' }).newName, 'Иван бен Петра');
  });
  it('son of / daughter of follow the script of the name', () => {
    assert.equal(proposeBenBat({ name: 'Sarah daughter of David' }).newName, 'Sarah bat David');
    assert.equal(proposeBenBat({ name: 'משה son of אברהם' }).newName, 'משה בן אברהם');
  });
  it('leaves correct names and look-alike words alone', () => {
    assert.equal(proposeBenBat({ name: 'Иван бен Петр', gender: 'male' }), null);
    assert.equal(proposeBenBat({ name: 'Сынкова Анна', gender: 'female' }), null);
    assert.equal(proposeBenBat({ name: '  Иван бен Петр ', gender: 'male' }), null);
  });
  it('flags a gender conflict instead of silently changing it', () => {
    const p = proposeBenBat({ name: 'Анна дочь Моше', gender: 'male' });
    assert.equal(p.ambiguous, true);
    assert.equal(p.newGender, 'male');
  });
  it('script is dry-run unless --apply', () => {
    const src = read('scripts/normalize-ben-bat.js');
    assert.match(src, /const APPLY = args\.includes\('--apply'\)/);
    assert.match(src, /if \(APPLY\) \{/);
    assert.doesNotMatch(src, /console\.log\(process\.env\.MONGODB_URI/);
  });
});
