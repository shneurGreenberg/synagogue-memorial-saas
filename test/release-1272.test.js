const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildHealthPayload } = require('../lib/health-payload');
const { sanitizeJewishFeedPayload } = require('../lib/sanitize-jewish-feed-learning');
const { computeJewishContentEtag } = require('../lib/jewish-content-etag');
const { sanitizeRussianLearningText } = require('../lib/jewish-translations');

const ROOT = path.join(__dirname, '..');
const I18N_DIR = path.join(ROOT, 'client', 'src', 'lib', 'i18n-resources');
const JEWISH_FEED_CLIENT = path.join(ROOT, 'client', 'src', 'lib', 'jewish-feed-client.js');
const JEWISH_PANELS = path.join(ROOT, 'client', 'src', 'components', 'JewishContentPanels.jsx');
const APP_JS = path.join(ROOT, 'app.js');
const EXPORT_SNAPSHOT = path.join(ROOT, 'scripts', 'export-static-snapshot.js');
const PAGES_FALLBACK = path.join(ROOT, 'scripts', 'build-github-pages-fallback.js');
const SIDEBAR_PAYLOAD = path.join(ROOT, 'lib', 'sidebar-app-payload.js');

describe('release 1.27.2 Tehillim cache and Russian labels', () => {
  it('ru i18n uses Теилим title without Псалмы sublabel', () => {
    const ru = fs.readFileSync(path.join(I18N_DIR, 'ru.js'), 'utf8');
    assert.match(ru, /daily_tehillim:\s*'Теилим'/);
    assert.match(ru, /daily_tehillim_sublabel:\s*''/);
  });

  it('he and en Tehillim sublabels unchanged from 1.27.1', () => {
    const he = fs.readFileSync(path.join(I18N_DIR, 'he.js'), 'utf8');
    const en = fs.readFileSync(path.join(I18N_DIR, 'en.js'), 'utf8');
    assert.match(he, /daily_tehillim_sublabel:\s*''/);
    assert.match(en, /daily_tehillim_sublabel:\s*'Tehillim'/);
  });

  it('client learning-label-display uses Russian psalter sanitizer', () => {
    const source = fs.readFileSync(
      path.join(ROOT, 'client', 'src', 'lib', 'learning-label-display.js'),
      'utf8',
    );
    assert.match(source, /sanitizeRussianLearningText/);
    assert.equal(sanitizeRussianLearningText('Псалтирь 66-68'), 'Псалмы 66-68');
  });

  it('JewishContentPanels applies formatLearningLabelForDisplay to gate values', () => {
    const source = fs.readFileSync(JEWISH_PANELS, 'utf8');
    assert.match(source, /formatLearningLabelForDisplay\(item\.label, uiLang\)/);
  });

  it('jewish-feed client busts HTTP and memory cache with app code version', () => {
    const source = fs.readFileSync(JEWISH_FEED_CLIENT, 'utf8');
    assert.match(source, /v:\s*APP_CODE_VERSION/);
    assert.match(source, /jewish-feed:v\$\{APP_CODE_VERSION\}/);
    assert.match(source, /cache:\s*'no-store'/);
    assert.match(source, /sanitizeJewishFeedPayload/);
  });

  it('jewish-content API uses short max-age and etag helper', () => {
    const source = fs.readFileSync(APP_JS, 'utf8');
    const route = source.match(/app\.get\('\/s\/:slug\/api\/jewish-content'[\s\S]*?\n\}\);/);
    assert.ok(route, 'jewish-content route');
    assert.match(route[0], /computeJewishContentEtag/);
    assert.match(route[0], /max-age=300/);
    assert.doesNotMatch(route[0], /max-age=3600/);
  });

  it('computeJewishContentEtag is stable for identical payloads', () => {
    const feed = { dailyLearning: { tehillim: { label: 'Псалмы 1' } } };
    assert.equal(computeJewishContentEtag(feed), computeJewishContentEtag(feed));
  });

  it('sanitizeJewishFeedPayload rewrites psalter wording in daily learning', () => {
    const feed = {
      dailyLearning: {
        tehillim: { label: 'Псалтирь 66-68' },
        hayomYom: {
          lessons5703: {
            tehillim: { label: 'Псалтырь 1-2' },
          },
        },
      },
    };
    const cleaned = sanitizeJewishFeedPayload(feed, 'ru');
    assert.equal(cleaned.dailyLearning.tehillim.label, 'Псалмы 66-68');
    assert.equal(cleaned.dailyLearning.hayomYom.lessons5703.tehillim.label, 'Псалмы 1-2');
  });

  it('static snapshot export and GitHub Pages fallback sanitize jewishContent', () => {
    assert.match(fs.readFileSync(EXPORT_SNAPSHOT, 'utf8'), /sanitizeJewishFeedPayload/);
    assert.match(fs.readFileSync(PAGES_FALLBACK, 'utf8'), /sanitizeJewishFeedPayload/);
  });

  it('sidebar-app payload still sources holidays via getJewishFeed (server-side sanitize)', () => {
    const source = fs.readFileSync(SIDEBAR_PAYLOAD, 'utf8');
    assert.match(source, /getJewishFeed/);
  });
});

describe('release 1.29.4 version metadata', () => {
  it('health endpoint reports app version 1.29.4', () => {
    const payload = buildHealthPayload();
    assert.equal(payload.version, '1.29.4');
  });

  it('lists 1.29.4 at the head of CHANGELOG.json', () => {
    const changelog = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'CHANGELOG.json'), 'utf8'),
    );
    assert.equal(changelog[0].version, '1.29.4');
  });
});
