const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Handlebars = require('handlebars');
const { SafeString } = require('handlebars');
const { getTranslator } = require('../lib/admin-translations');
const { enrichSynagogueForAdmin } = require('../lib/admin-theme');
const { FULL_ADMIN_PERMISSIONS } = require('../lib/admin-users');
const { renderAdminIcon } = require('../lib/admin-icons');

const ROOT = path.join(__dirname, '..');
const partialsDir = path.join(ROOT, 'views', 'partials');

function registerPartials() {
  fs.readdirSync(partialsDir).forEach((file) => {
    if (!file.endsWith('.handlebars')) {
      return;
    }
    const name = file.replace(/\.handlebars$/, '');
    Handlebars.registerPartial(
      name,
      fs.readFileSync(path.join(partialsDir, file), 'utf8'),
    );
  });
}

function buildSettingsDashboardContext() {
  const synagogue = enrichSynagogueForAdmin({
    slug: 'test-shul',
    language: 'ru',
    titles: { ru: 'Title RU', en: 'Title EN', he: 'Title HE' },
    theme: {},
    boardFeatures: {},
    publicSubmission: { enabled: false },
    memorialQrPanel: {},
    shabbatTimesEnabled: false,
    savedViews: [],
  });

  const adminTranslate = getTranslator('en');

  return {
    synagogue,
    boardTitles: synagogue.titles,
    memorialQrPanel: synagogue.memorialQrPanel,
    adminPermissions: FULL_ADMIN_PERMISSIONS,
    canSaveBoardSettings: true,
    adminTranslate,
    t(key) {
      return adminTranslate(key);
    },
    textsFontScaleGroups: [
      {
        groupKey: 'typography_center_column',
        helpKey: 'typography_center_column_help',
        sliders: [
          {
            key: 'tileTitle',
            labelKey: 'font_scale_tile_title',
            helpKey: 'font_scale_tile_title_help',
            value: 100,
          },
          {
            key: 'tileDate',
            labelKey: 'font_scale_tile_date',
            helpKey: 'font_scale_tile_date_help',
            value: 100,
          },
        ],
      },
    ],
    candlePaletteOptions: [{ key: 'classic', labelKey: 'candle_palette_classic' }],
    candleSlider: {
      key: 'candle',
      labelKey: 'font_scale_candle',
      helpKey: 'font_scale_candle_help',
      min: 40,
      max: 150,
      step: 5,
      value: 100,
    },
    boardFeatureGroups: [],
    savedViews: [],
    activeSavedViewId: '',
    activeSavedViewName: '',
    saved: false,
    published: false,
    error: null,
    codeRelease: { unseen: false, version: '0.0.0', changelog: [] },
    undatedPeopleCount: 0,
  };
}

function compileDashboardTemplate() {
  registerPartials();
  const source = fs.readFileSync(
    path.join(ROOT, 'views', 'admin', 'dashboard.handlebars'),
    'utf8',
  );

  return Handlebars.compile(source, {
    noEscape: true,
    strict: false,
  });
}

describe('admin settings dashboard template', () => {
  it('renders compact settings markup without template errors', () => {
    const compile = compileDashboardTemplate();
    const helpers = {
      eq: (a, b) => a === b,
      or: (...args) => args.slice(0, -1).some(Boolean),
      and: (...args) => args.slice(0, -1).every(Boolean),
      t(key, options) {
        const root = options.data && options.data.root;
        const fn = (root && root.t) || getTranslator('en');
        return typeof fn === 'function' ? fn(key) : key;
      },
      adminIcon(name, options) {
        const className = (options && options.hash && options.hash.class) || 'btn-admin-icon';
        return new SafeString(renderAdminIcon(name, className));
      },
    };

    Handlebars.registerHelper(helpers);

    const html = compile(buildSettingsDashboardContext());

    assert.match(html, /settings-color-grid/);
    assert.match(html, /settings-media-grid/);
    assert.match(html, /settings-media-grid--community/);
    assert.match(html, /adminCandlePreview/);
    assert.match(html, /logo-bg-swatch-row/);
    assert.match(html, /name="primaryColor"/);
    assert.match(html, /name="tileOpacity"/);
    assert.match(html, /name="titleRu"/);
    assert.match(html, /settings-texts-styling-block/);
    assert.match(html, /settings-texts-content-block/);
    assert.match(html, /settings-copy-details/);
    assert.match(html, /name="donationQrTitleRu"/);
    assert.match(html, /admin-number-stepper/);
    assert.doesNotMatch(html, /type="range"/);
    assert.doesNotMatch(html, /<details[^>]*\sopen[\s=>]/i);
    assert.match(html, /id="fontScale_tileDate"/);
    assert.match(html, /settings-candle-scale-field/);
    assert.match(html, /name="fontScale_candle"/);
    assert.doesNotMatch(html, /settings-scale-tile-date/);
    assert.doesNotMatch(html, /live_preview_help/);
  });
});
