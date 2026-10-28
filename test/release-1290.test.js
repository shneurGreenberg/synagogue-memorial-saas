const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const { SELECT_SETTINGS } = require('../lib/admin-synagogue-load');
const { buildBoardSettingsUpdate } = require('../lib/admin-board-settings-save');
const { slimPublicPerson, PUBLIC_BOARD_FIELDS } = require('../lib/public-board');
const { isPersonPermanentActive, parsePermanentFromBody } = require('../lib/permanent-person');
const {
  normalizeBoardMode, parsePrayerTimesFromBody, prayerTimeRowsForAdmin,
} = require('../lib/board-mode');
const { onboardingTitlesFromBody } = require('../routes/onboarding');
const Synagogue = require('../models/Synagogue');

const FULL = {
  settingsAppearance: true, settingsLanguages: true, settingsFeatures: true, settingsBranding: true,
};

describe('release 1.29 G5: settings save never reverts fields', () => {
  it('settings profile selects every top-level Synagogue field used by admin templates', () => {
    const selected = new Set(SELECT_SETTINGS.split(/\s+/).map((f) => f.split('.')[0]));
    const schemaPaths = new Set(Object.keys(Synagogue.schema.paths).map((p) => p.split('.')[0]));
    const files = fs.readdirSync(path.join(root, 'views/admin')).map((f) => `views/admin/${f}`)
      .concat(fs.readdirSync(path.join(root, 'views/partials')).filter((f) => f.startsWith('admin-')).map((f) => `views/partials/${f}`));
    const used = new Set();
    files.forEach((file) => {
      for (const m of read(file).matchAll(/synagogue\.([a-zA-Z]+)/g)) used.add(m[1]);
    });
    used.forEach((field) => {
      if (schemaPaths.has(field)) assert.ok(selected.has(field), `settings profile must select "${field}"`);
    });
    ['language', 'boardMode', 'prayerTimes', 'weeklyChapterEnabled'].forEach((f) => assert.ok(selected.has(f), f));
  });

  it('language is saved only when valid', () => {
    assert.equal(buildBoardSettingsUpdate({ language: 'he' }, {}, FULL).language, 'he');
    assert.equal(buildBoardSettingsUpdate({ language: '' }, {}, FULL).language, undefined);
    assert.equal(buildBoardSettingsUpdate({ language: 'xx' }, {}, FULL).language, undefined);
    assert.equal(buildBoardSettingsUpdate({}, { language: 'he' }, FULL).language, undefined);
  });

  it('master community edit invalidates admin + board caches', () => {
    const src = read('routes/master.js');
    assert.match(src, /invalidateAdminSynagogueCache\(s\)/);
    assert.match(src, /invalidateBoardCache\(s\)/);
  });
});

describe('release 1.29 G1-G4: new-community wizard', () => {
  it('labels and space blocking', () => {
    const { getOnboardingTranslator } = require('../lib/onboarding-i18n');
    const t = getOnboardingTranslator('he');
    assert.equal(t('web_address_label'), 'שם בית הכנסת באנגלית (ללא רווחים)');
    assert.equal(t('title_en_label'), 'כותרת');
    assert.match(t('slug_space_alert'), /מילה אחת/);
    const view = read('views/onboarding/wizard.handlebars');
    assert.match(view, /data-space-alert=/);
    assert.doesNotMatch(view, /name="titleHe"/);
    assert.match(view, /<option value="he" selected>עברית<\/option>/);
    assert.match(read('public/js/onboarding-wizard.js'), /ev\.key === ' '/);
  });

  it('single name field fills the Hebrew title; generic title goes to the board language', () => {
    assert.equal(onboardingTitlesFromBody({ boardLanguage: 'he' }, 'בית חב״ד').he, 'בית חב״ד');
    assert.equal(onboardingTitlesFromBody({ boardLanguage: 'ru', title: 'Кадиш' }, 'x').ru, 'Кадиш');
    assert.equal(onboardingTitlesFromBody({ titleEn: 'Legacy' }, 'x').en, 'Legacy');
  });
});

describe('release 1.29 A: permanent deceased', () => {
  it('parses checkbox + optional end date', () => {
    assert.deepEqual(parsePermanentFromBody({ permanent: ['0', '1'], permanentUntil: '' }), { permanent: true, permanentUntil: null });
    assert.equal(parsePermanentFromBody({ permanent: '0', permanentUntil: '2030-01-01' }).permanentUntil, null);
    assert.ok(parsePermanentFromBody({ permanent: '1', permanentUntil: '2030-01-01' }).permanentUntil instanceof Date);
  });

  it('active until end date and exposed on the public payload', () => {
    const now = new Date('2026-10-26T10:00:00Z');
    assert.equal(isPersonPermanentActive({ permanent: true }, now), true);
    assert.equal(isPersonPermanentActive({ permanent: true, permanentUntil: '2026-10-25T23:59:59Z' }, now), false);
    assert.equal(isPersonPermanentActive({ permanent: false }, now), false);
    assert.equal(slimPublicPerson({ id: 1, name: 'a', permanent: true }).permanent, true);
    assert.equal(slimPublicPerson({ id: 1, name: 'a' }).permanent, undefined);
  });

  it('board renders a permanent frame', () => {
    assert.match(read('client/src/components/MemorialCard.jsx'), /card-permanent/);
    assert.match(read('styles/home.scss'), /\.card\.card-permanent/);
  });
});

describe('release 1.29 B: combined board', () => {
  it('mode + prayer times parsing', () => {
    assert.equal(normalizeBoardMode('combined'), 'combined');
    assert.equal(normalizeBoardMode('x'), 'memorial');
    const rows = parsePrayerTimesFromBody({ prayerTimesSection: '1', prayerLabel_0: 'שחרית', prayerTime_0: '7:05', prayerLabel_1: 'מנחה', prayerTime_1: '' });
    assert.deepEqual(rows, [{ label: 'שחרית', time: '07:05' }]);
    const update = buildBoardSettingsUpdate({ boardMode: 'combined', prayerTimesSection: '1', prayerLabel_0: 'A', prayerTime_0: '06:30' }, {}, FULL);
    assert.equal(update.boardMode, 'combined');
    assert.deepEqual(update.prayerTimes, [{ label: 'A', time: '06:30' }]);
  });

  it('admin defaults follow the board language (Russian stays Russian)', () => {
    assert.equal(prayerTimeRowsForAdmin({ language: 'ru' })[0].label, 'Шахарит');
    assert.equal(prayerTimeRowsForAdmin({ language: 'he' })[0].label, 'שחרית');
  });

  it('public payload carries mode + prayer times; client i18n has all keys', () => {
    assert.ok(PUBLIC_BOARD_FIELDS.includes('boardMode'));
    assert.ok(PUBLIC_BOARD_FIELDS.includes('prayerTimes'));
    ['he', 'ru', 'en'].forEach((lang) => {
      const src = read(`client/src/lib/i18n-resources/${lang}.js`);
      ['zmanim_title', 'zman_netz', 'zman_shkia', 'prayer_times_title', 'announcements_title', 'permanent_mark']
        .forEach((key) => assert.match(src, new RegExp(`\\b${key}:`), `${lang}.${key}`));
    });
    const ru = read('client/src/lib/i18n-resources/ru.js');
    const tail = ru.slice(ru.indexOf('zmanim_title'));
    assert.doesNotMatch(tail, /[\u0590-\u05FF]/, 'Russian strings must not contain Hebrew');
  });

  it('hebcal zmanim compute for a real location', () => {
    const Hebcal = require('hebcal');
    const d = new Hebcal.HDate(new Date(2026, 9, 26, 12));
    d.setLocation(55.03, 82.92);
    const z = d.getZemanim();
    assert.ok(z.neitz_hachama < z.chatzot && z.chatzot < z.shkiah);
  });
});

describe('release 1.29 login hint', () => {
  it('mentions the personal code', () => {
    const { translations } = require('../lib/admin-translations');
    assert.match(translations.he.user_login_hint, /קוד אישי/);
    assert.match(translations.ru.user_login_hint, /личный код/);
    assert.match(read('views/admin/login.handlebars'), /personal code/);
  });
});

describe('release 1.29 H1-H6', () => {
  it('H1: Hebrew boards never get non-Hebrew Hayom Yom text', () => {
    const src = read('lib/jewish-feed.js');
    assert.match(src, /lang === 'he' && !\/\[\\u0590-\\u05FF\]\//);
  });
  it('H2: Gregorian dates on Hebrew boards use Hebrew month names', () => {
    assert.match(read('client/src/lib/novosibirsk.js'), /'באוקטובר'/);
  });
  it('H3: Hebrew-dates-only toggle is saved, selected and public', () => {
    assert.equal(buildBoardSettingsUpdate({ hebrewDatesOnly: ['0', '1'] }, {}, FULL).hebrewDatesOnly, true);
    assert.equal(buildBoardSettingsUpdate({ hebrewDatesOnly: '0' }, {}, FULL).hebrewDatesOnly, false);
    assert.ok(SELECT_SETTINGS.includes('hebrewDatesOnly'));
    assert.ok(PUBLIC_BOARD_FIELDS.includes('hebrewDatesOnly'));
    assert.match(read('client/src/lib/novosibirsk.js'), /isHebrewDatesOnly\(\)\) {\s*return '';/);
  });
  it('H4: ב״ה sits outside the right frame', () => {
    assert.match(read('client/src/pages/HomePage.jsx'), /<aside className="right side-panel">\s*<BaruchHashemBadge placement="outside" \/>/);
  });
  it('H5: no separate subtitle font picker; color + weight side by side', () => {
    const src = read('views/partials/admin-settings-community-texts.handlebars');
    assert.doesNotMatch(src, /<select name="boardSubtitleFont"/);
    assert.match(src, /board-subtitle-color-weight-row/);
  });
  it('H6: add-name page defaults to the board language', () => {
    const { resolvePublicSubmissionLang } = require('../lib/public-submission-i18n');
    assert.equal(resolvePublicSubmissionLang(undefined, 'he'), 'he');
    assert.equal(resolvePublicSubmissionLang('ru', 'he'), 'ru');
  });
});

describe('release 1.29 H7', () => {
  it('QR size scale drives the rendered QR frame', () => {
    const scss = read('styles/home.scss');
    assert.match(scss, /\.memorial-submission-qr-frame \{[\s\S]*?width: var\(--board-qr-image-size\)/);
    assert.match(read('client/src/components/MemorialSubmissionPanel.jsx'), /memorial-submission-qr-frame/);
  });
});
