const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');
const Handlebars = require('handlebars');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const { buildBoardSettingsUpdate } = require('../lib/admin-board-settings-save');
const { SELECT_SETTINGS } = require('../lib/admin-synagogue-load');
const { PUBLIC_BOARD_FIELDS } = require('../lib/public-board');
const { resolveBoardCalendar, resolveDateDisplay } = require('../lib/board-date-settings');
const { isYahrzeitOnDate, resolveYahrzeitOptions } = require('../lib/yahrzeit');
const { buildUpcomingYahrzeitRows } = require('../lib/admin-upcoming-yahrzeit');

const FULL = {
  settingsAppearance: true, settingsLanguages: true, settingsFeatures: true, settingsBranding: true,
};

describe('1.30.0 I10: board calendar + dates shown', () => {
  it('migrates the legacy flag safely and idempotently', () => {
    assert.equal(resolveBoardCalendar({ hebrewDatesOnly: true }), 'hebrew');
    assert.equal(resolveDateDisplay({ hebrewDatesOnly: true }), 'hebrew');
    assert.equal(resolveBoardCalendar({}), 'gregorian');
    assert.equal(resolveDateDisplay({}), 'both');
    assert.equal(resolveBoardCalendar(null), 'gregorian');
    // explicit values win over the legacy flag, and resolving twice is stable
    const s = { hebrewDatesOnly: true, boardCalendar: 'gregorian', dateDisplay: 'both' };
    assert.equal(resolveBoardCalendar(s), 'gregorian');
    assert.equal(resolveDateDisplay({ ...s, dateDisplay: resolveDateDisplay(s) }), 'both');
    assert.equal(resolveBoardCalendar({ boardCalendar: 'bogus', hebrewDatesOnly: true }), 'hebrew');
  });
  it('saves, loads and publishes both settings', () => {
    const u = buildBoardSettingsUpdate({ boardCalendar: 'hebrew', dateDisplay: 'gregorian' }, {}, FULL);
    assert.equal(u.boardCalendar, 'hebrew');
    assert.equal(u.dateDisplay, 'gregorian');
    assert.equal(u.hebrewDatesOnly, false);
    assert.equal(buildBoardSettingsUpdate({ dateDisplay: 'hebrew' }, {}, FULL).hebrewDatesOnly, true);
    assert.equal(buildBoardSettingsUpdate({ boardCalendar: 'x' }, { hebrewDatesOnly: true }, FULL).boardCalendar, 'hebrew');
    ['boardCalendar', 'dateDisplay'].forEach((k) => {
      assert.ok(SELECT_SETTINGS.includes(k));
      assert.ok(PUBLIC_BOARD_FIELDS.includes(k));
    });
    const v = read('views/admin/dashboard.handlebars');
    assert.match(v, /name="boardCalendar"/);
    assert.match(v, /name="dateDisplay"/);
    assert.ok(!v.includes('id="hebrewDatesOnly"'));
  });
  it('hebrew calendar ignores the Gregorian anniversary', () => {
    const person = { name: 'A', gregorianDateOfDeath: { year: 2000, month: 3, date: 10 } };
    const gregDay = new Date(2026, 2, 10);
    assert.equal(isYahrzeitOnDate(person, gregDay, resolveYahrzeitOptions({})), true);
    assert.equal(isYahrzeitOnDate(person, gregDay, resolveYahrzeitOptions({ boardCalendar: 'hebrew' })), false);
  });
  it('admin list shows only the chosen dates', () => {
    const syn = { people: [{ id: 1, name: 'A', gregorianDateOfDeath: { year: 2000, month: 3, date: 10 } }],
      location: { timezone: 'Asia/Jerusalem' } };
    const now = new Date(Date.UTC(2026, 2, 10, 10));
    const both = buildUpcomingYahrzeitRows(syn, now, 1, 'he');
    assert.ok(both[0].hebrewDateLabel && both[0].gregorianDateLabel);
    const heb = buildUpcomingYahrzeitRows({ ...syn, dateDisplay: 'hebrew' }, now, 1, 'he');
    assert.equal(heb[0].gregorianDateLabel, '');
    const greg = buildUpcomingYahrzeitRows({ ...syn, dateDisplay: 'gregorian' }, now, 1, 'he');
    assert.equal(greg[0].hebrewDateLabel, '');
  });
  it('board orders by the next Hebrew anniversary', () => {
    const { daysUntilHebrewYahrzeit } = require('../lib/hebrew-yahrzeit-order');
    const today = new Date(2026, 9, 29);
    assert.equal(daysUntilHebrewYahrzeit({ year: 2010, month: 10, date: 29 }, today) >= 0, true);
    // died on today's Hebrew date some year -> 0 days
    const Hebcal = require('hebcal');
    const h = new Hebcal.HDate(today);
    const g = new Hebcal.HDate(h.getDate(), h.getMonth(), h.getFullYear() - 10).greg();
    const death = { year: g.getFullYear(), month: g.getMonth() + 1, date: g.getDate() };
    assert.equal(daysUntilHebrewYahrzeit(death, today), 0);
    const tomorrow = new Hebcal.HDate(h.getDate(), h.getMonth(), h.getFullYear()).next();
    const g2 = new Hebcal.HDate(tomorrow.getDate(), tomorrow.getMonth(), tomorrow.getFullYear() - 10).greg();
    assert.equal(daysUntilHebrewYahrzeit({ year: g2.getFullYear(), month: g2.getMonth() + 1, date: g2.getDate() }, today), 1);
    assert.match(read('client/src/pages/HomePage.jsx'), /isPersonYahrzeitToday\(person, timezone, referenceDate, calendar\)/);
  });
});

describe('1.30.0 I11: zmanim/prayers loop seamlessly', () => {
  it('renders a second copy and never reverses', () => {
    const src = read('client/src/components/SynagogueInfoPanel.jsx');
    assert.match(src, /export function useLoopScroll/);
    assert.match(src, /pos -= period/);
    assert.match(src, /zmanimLoop \? \['a', 'b'\]/);
    assert.match(src, /prayersLoop \? \['a', 'b'\]/);
  });
});

describe('1.30.0 I12/I15: each color controls what its label says', () => {
  it('clock and Shabbat have their own colors', () => {
    const css = read('client/src/components/ThemeStyles.jsx');
    assert.match(css, /board-clock-block time \{\s*color: var\(--clock-color, #ffffff\) !important;/);
    assert.match(css, /shabbat-parsha-name \{\s*color: var\(--shabbat-color, var\(--accent-color\)\) !important;/);
    const u = buildBoardSettingsUpdate({ clockColor: '#112233', shabbatColor: '#445566' }, { theme: {} }, FULL);
    assert.equal(u['theme.clockColor'], '#112233');
    assert.equal(u['theme.shabbatColor'], '#445566');
    const { getTranslator } = require('../lib/admin-translations');
    const t = getTranslator('he');
    assert.equal(t('clock_color'), 'צבע שעון ותאריך');
    assert.match(t('primary_color'), /^צבע כותרות/);
    assert.match(t('accent_color'), /^צבע כותרות משנה/);
    assert.ok(!t('accent_color').includes('שעון'));
  });
});

describe('1.30.0 I13/I14: combined text-size controls', () => {
  const v = read('views/admin/dashboard.handlebars');
  it('render once, outside the per-group loop, visible when combined is on', () => {
    assert.equal((v.match(/id="combinedTextSizeGroup"/g) || []).length, 1);
    const grp = v.indexOf('id="combinedTextSizeGroup"');
    const loopStart = v.indexOf('{{#each textsFontScaleGroups}}');
    const loopEnd = v.indexOf('{{/each}}', v.lastIndexOf('{{/each}}', grp - 1) - 1);
    assert.ok(loopStart > 0 && loopEnd > loopStart && loopEnd < grp);
    const snippet = v.slice(v.lastIndexOf('<div', grp), v.indexOf('>', grp) + 1);
    const html = Handlebars.create();
    html.registerHelper('eq', (a, b) => a === b);
    assert.ok(!html.compile(snippet + '</div>')({ boardMode: 'combined' }).includes('hidden'));
    assert.ok(html.compile(snippet + '</div>')({ boardMode: 'memorial' }).includes('hidden'));
  });
  it('value saves (even if posted twice) and the board CSS uses it with priority', () => {
    assert.equal(buildBoardSettingsUpdate({ combinedInfoScale: ['150', '160'] }, {}, FULL).combinedInfoScale, 160);
    assert.equal(buildBoardSettingsUpdate({ combinedAnnouncementScale: '180' }, {}, FULL).combinedAnnouncementScale, 180);
    assert.ok(PUBLIC_BOARD_FIELDS.includes('combinedInfoScale'));
    const scss = read('styles/home.scss');
    assert.match(scss, /\.main-container \.synagogue-info-panel--two-col \.synagogue-info-col \.synagogue-info-row \{\s*font-size: calc\(clamp\(10px, 0\.82vw, 16px\) \* var\(--combined-info-scale, 1\)\) !important;/);
    assert.match(read('client/src/components/SynagogueInfoPanel.jsx'), /'--combined-info-scale': clampScale\(data\.combinedInfoScale\)/);
    assert.match(v, /\['combinedInfoScale', 'combinedAnnouncementScale'\]\.forEach\(function \(id\) \{\s*var el = document\.getElementById\(id\);\s*if \(el\) \{\s*el\.addEventListener\('input', schedulePreview\);/);
  });
});

describe('1.30.0 I16: click-to-edit preview (stage 1)', () => {
  it('maps board parts to existing form fields', () => {
    const js = read('public/js/admin-preview-editor.js');
    ['.board-clock-block', '.board-header', '.synagogue-info-panel', '.side-panel', '.cards-grid .card'].forEach((sel) => {
      assert.ok(js.includes(sel), sel);
    });
    assert.match(js, /real\.value = proxy\.value; fire\(real\)/);
    const v = read('views/admin/dashboard.handlebars');
    assert.match(v, /<script src="\/js\/admin-preview-editor\.js"><\/script>/);
    assert.match(v, /id="previewEditToggle"/);
  });
});
