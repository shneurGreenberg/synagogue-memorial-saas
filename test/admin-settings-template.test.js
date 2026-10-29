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
const { BOARD_FONTS, normalizeBoardFont } = require('../lib/board-fonts');

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
    boardTitleText: synagogue.boardTitleText,
    boardSubtitle: synagogue.boardSubtitle,
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
    boardFontOptions: BOARD_FONTS.map((font) => ({
      id: font.id,
      labelKey: font.labelKey,
      family: font.family,
      previewSample: font.previewSample,
      selected: normalizeBoardFont(synagogue.theme.boardFont) === font.id,
    })),
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
      firstOf: (...args) => args.slice(0, -1).find(Boolean) || '',
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
    assert.match(html, /name="boardFont"/);
    assert.match(html, /publicSubmissionShowDonationQr/);
    assert.match(html, /name="primaryColor"/);
    assert.match(html, /name="tileOpacity"/);
    assert.match(html, /name="panelBorderColor"/);
    assert.match(html, /name="panelBorderRadius"/);
    assert.match(html, /name="panelBorderWidth"/);
    assert.match(html, /name="tileBorderColor"/);
    assert.match(html, /name="tileBorderRadius"/);
    assert.match(html, /name="tileBorderWidth"/);
    assert.match(html, /שלום/);
    assert.match(html, /name="boardTitleText"/);
    assert.match(html, /name="boardSubtitleText"/);
    assert.match(html, /id="boardSubtitleDesignFields"/);
    assert.match(html, /name="boardFeaturesSection"/);
    assert.match(html, /settings-candle-palette-field[\s\S]*settings-candle-scale-label/);
    const candleTile = html.match(/<article class="settings-media-tile settings-candle-preview-tile">[\s\S]*?<\/article>/);
    assert.ok(candleTile, 'candle preview tile');
    assert.doesNotMatch(candleTile[0], /saved-view-thumb-label/);
    assert.match(html, /settings-texts-styling-block/);
    assert.match(html, /settings-texts-content-block/);
    assert.match(html, /settings-copy-details/);
    assert.match(html, /name="donationQrTitle"/);
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
