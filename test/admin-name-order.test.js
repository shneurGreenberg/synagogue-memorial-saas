/**
 * 1.41.0: the "Name order on the board" panel on the people page.
 *
 * - The panel is a compact toolbar: two small labelled options + a «save settings» button on the
 *   same row on desktop, and the button full-width below 600px (it is deliberately NOT inside
 *   .form-actions-sticky, whose submit button is hidden on phones).
 * - The setting affects the public board only: saveCommunityNameOrder stores `nameOrder` and never
 *   rewrites people[].name, so the admin list, its sorting and its search keep the stored name.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const http = require('node:http');
const express = require('express');
const bodyParser = require('body-parser');
const Handlebars = require('handlebars');
const { SafeString } = require('handlebars');
const { getTranslator } = require('../lib/admin-translations');
const { renderAdminIcon } = require('../lib/admin-icons');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const view = read('views/admin/people.handlebars');
const scss = read('styles/admin.scss');

function nameOrderSection() {
  const start = view.indexOf('<section class="people-name-order-panel"');
  assert.ok(start > 0, 'the name-order panel exists');
  const end = view.indexOf('</section>', start);
  return view.slice(start, end + '</section>'.length);
}

describe('1.41.0: name order panel markup (compact row + save button)', () => {
  it('the two options are small segmented radios labelled in words', () => {
    const section = nameOrderSection();
    assert.match(section, /class="admin-seg people-name-order-seg" role="radiogroup"/);
    assert.match(section, /name="nameOrder" value="surname-first"/);
    assert.match(section, /name="nameOrder" value="given-first"/);
    assert.match(section, /\{\{t 'name_order_surname_first'\}\}/);
    assert.match(section, /\{\{t 'name_order_given_first'\}\}/);
    // text only — no colour-only chip and no oversized example inside each option
    assert.doesNotMatch(section, /people-name-order-example"/);
    assert.doesNotMatch(section, /<small/);
  });

  it('the save button is the existing admin "save settings" style and sits in the same row', () => {
    const section = nameOrderSection();
    const rowStart = section.indexOf('class="people-name-order-row"');
    const rowEnd = section.indexOf('</div>', section.indexOf('people-name-order-save'));
    assert.ok(rowStart > 0, 'the row wrapper exists');
    assert.ok(rowEnd > rowStart, 'the save button lives inside the row');
    const saveButton = section.slice(section.indexOf('<button type="submit"'), rowEnd);
    assert.match(saveButton, /class="btn-admin btn-admin-primary btn-admin-sm btn-admin-with-icon people-name-order-save"/);
    assert.match(saveButton, /\{\{t 'save'\}\}/);
    assert.match(saveButton, /adminIcon 'save'/);
  });

  it('the save button is not inside .form-actions-sticky (whose submit is hidden on phones)', () => {
    const section = nameOrderSection();
    assert.doesNotMatch(section, /form-actions-sticky/);
    // the global phone rule that hides section saves must not be able to hide this one
    assert.match(scss, /\.admin-body \.form-actions-sticky > button\[type="submit"\]/);
    assert.match(scss, /\.people-name-order-save \{/);
  });

  it('the three translations exist for the save label and the corrected hint', () => {
    ['he', 'ru', 'en'].forEach((lang) => {
      const t = getTranslator(lang);
      assert.equal(t('save'), { he: 'שמור הגדרות', ru: 'Сохранить настройки', en: 'Save Settings' }[lang]);
      assert.equal(t('name_order_label').length > 0, true);
      assert.equal(t('name_order_surname_first').length > 0, true);
      assert.equal(t('name_order_given_first').length > 0, true);
      assert.match(t('name_order_hint'), /board|табло|הלוח/u);
    });
  });

  it('renders without a template error and keeps the row structure', () => {
    const section = nameOrderSection();
    const compile = Handlebars.compile(section, { noEscape: true, strict: false });
    const t = getTranslator('he');
    const html = compile({
      synagogue: { slug: 'demo', language: 'he' },
      nameOrderOptions: { selected: 'given-first', saved: 'given-first', detected: '', isDetected: false },
    }, {
      helpers: {
        eq: (a, b) => a === b,
        t: (key) => t(key),
        adminIcon: (name, options) => new SafeString(renderAdminIcon(name, (options.hash || {}).class)),
      },
    });
    assert.match(html, /people-name-order-row/);
    assert.match(html, /value="given-first" checked/);
    assert.doesNotMatch(html, /value="surname-first" checked/);
    assert.match(html, /people-name-order-save/);
    assert.match(html, /שמור הגדרות/);
  });
});

describe('1.41.0: name order panel styles', () => {
  it('desktop: options are compact (no forced wide flex) and the save button is auto-width', () => {
    assert.match(scss, /\.people-name-order-row \{ display: flex; flex-wrap: wrap; align-items: center;/);
    assert.match(scss, /\.people-name-order-seg \.admin-seg-option span \{[^}]*white-space: nowrap;/);
    assert.match(scss, /\.people-name-order-save \{ flex: 0 0 auto; margin-inline-start: auto; \}/);
    // the old oversized layout (220px options stretched across the panel) is gone
    assert.doesNotMatch(scss, /\.people-name-order-seg \.admin-seg-option \{ flex: 1 1 220px; \}/);
    assert.doesNotMatch(scss, /\.people-name-order-seg \{ width: 100%; \}/);
  });

  it('the checked option carries a text cue, not colour alone', () => {
    assert.match(scss, /\.people-name-order-seg \.admin-seg-option input:checked \+ span::before \{ content: '✓';/);
  });

  it('below 600px the save button is full-width and the options share one row', () => {
    const start = scss.indexOf('@media (max-width: 599.98px) {');
    assert.ok(start > 0, 'the phone media query exists');
    const block = scss.slice(start, scss.indexOf('\n}', scss.indexOf('.people-name-order-save { width: 100%', start)));
    assert.match(block, /\.people-name-order-row \{ flex-direction: column; align-items: stretch; \}/);
    assert.match(block, /\.people-name-order-seg \.admin-seg-option \{ flex: 1 1 0; min-width: 0; \}/);
    assert.match(block, /\.people-name-order-save \{ width: 100%; margin-inline-start: 0; \}/);
  });
});

describe('1.41.0: saving the name order only stores the setting', () => {
  const SLUG = 'demo';

  async function withAdminApp(fakeSynagogue, run) {
    const load = require('../lib/admin-synagogue-load');
    const originalLoad = load.loadAdminSynagogue;
    const originalInvalidate = load.invalidateAdminSynagogueCache;
    load.loadAdminSynagogue = async () => ({
      slug: SLUG, adminUsers: [], savedViews: [], adminLanguage: 'he', language: 'ru',
    });
    load.invalidateAdminSynagogueCache = () => {};

    const Synagogue = require('../models/Synagogue');
    const originalFindOne = Synagogue.findOne;
    const originalUpdateOne = Synagogue.updateOne;
    const updates = [];
    Synagogue.findOne = () => ({ lean: async () => ({ _id: 'x' }) });
    Synagogue.updateOne = async (filter, update) => {
      updates.push({ filter, update });
      return { acknowledged: true, modifiedCount: 1 };
    };
    void fakeSynagogue;

    delete require.cache[require.resolve('../routes/admin.js')];
    const router = require('../routes/admin');
    const app = express();
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use((req, res, next) => {
      req.session = { adminSlug: SLUG, adminUsername: null };
      next();
    });
    app.use('/admin', router);
    app.use((err, req, res, next) => res.status(err.status || 500).send(err.message));

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    try {
      return await run({ server, updates });
    } finally {
      await new Promise((resolve) => server.close(resolve));
      Synagogue.findOne = originalFindOne;
      Synagogue.updateOne = originalUpdateOne;
      load.loadAdminSynagogue = originalLoad;
      load.invalidateAdminSynagogueCache = originalInvalidate;
      delete require.cache[require.resolve('../routes/admin.js')];
    }
  }

  function post(server, bodyPath, form) {
    const body = new URLSearchParams(form).toString();
    const address = server.address();
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: address.port,
        method: 'POST',
        path: bodyPath,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Content-Length': Buffer.byteLength(body),
          'X-Requested-With': 'XMLHttpRequest',
        },
      }, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve({
          status: res.statusCode,
          body: Buffer.concat(chunks).toString('utf8'),
        }));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  it('writes only nameOrder — people[] is never part of the update', async () => {
    await withAdminApp(null, async ({ server, updates }) => {
      const res = await post(server, `/admin/${SLUG}/people/name-order`, { nameOrder: 'given-first' });
      assert.equal(res.status, 200);
      assert.deepEqual(JSON.parse(res.body), { ok: true, nameOrder: 'given-first' });

      assert.equal(updates.length, 1);
      const { filter, update } = updates[0];
      assert.deepEqual(filter, { slug: SLUG });
      assert.deepEqual(update, { $set: { nameOrder: 'given-first' } });
      assert.equal(Object.keys(update.$set).length, 1);
      // no path into people[] (or into any other field) can be touched by this handler
      assert.doesNotMatch(JSON.stringify(update), /people/);
      assert.doesNotMatch(JSON.stringify(update), /\$unset|\$pull|\$push/);
    });
  });

  it('an unknown value clears the setting instead of being stored', async () => {
    await withAdminApp(null, async ({ server, updates }) => {
      const res = await post(server, `/admin/${SLUG}/people/name-order`, { nameOrder: 'sideways' });
      assert.equal(res.status, 200);
      assert.equal(JSON.parse(res.body).nameOrder, '');
      assert.deepEqual(updates[0].update, { $set: { nameOrder: '' } });
    });
  });

  it('another community slug is rejected before anything is written', async () => {
    await withAdminApp(null, async ({ server, updates }) => {
      const res = await post(server, '/admin/other-shul/people/name-order', { nameOrder: 'given-first' });
      assert.equal(res.status, 403);
      assert.equal(updates.length, 0);
    });
  });

  it('the admin never composes a name with nameOrder (stored name stays canonical)', () => {
    const routes = read('routes/admin.js');
    // the admin builds names with composeAdminName (surname-first) only
    assert.match(routes, /composeAdminName\(/);
    assert.doesNotMatch(routes, /composePersonName\(/);
    // the list, its search and its total all read the stored `name`
    assert.match(routes, /personMatchesPeopleSearch\(person, query\)/);
    assert.match(routes, /let people = synagogue\.people \|\| \[\];/);
    // the save handler stores the setting and nothing else
    const handler = routes.slice(routes.indexOf('async function saveCommunityNameOrder'));
    const handlerBlock = handler.slice(0, handler.indexOf('router.post('));
    assert.doesNotMatch(handlerBlock, /people\.\$|people\b\s*:|composePersonName|\$set: \{ nameOrder, people/);
    assert.match(handlerBlock, /\{ \$set: \{ nameOrder \} \}/);
  });

  it('the client list sorts and searches on the stored name, not the board name', () => {
    const js = read('public/js/admin-people.js');
    assert.match(js, /row\.setAttribute\('data-name', person\.name \|\| ''\)/);
    assert.match(js, /a\.getAttribute\('data-name'\)\.localeCompare\(b\.getAttribute\('data-name'\)\)/);
    // the only name-order interaction is the panel itself: no composition, no re-sorting by order
    assert.doesNotMatch(js, /composePersonName|composeName|surname-first|given-first/);
  });

  it('the panel guards against a double submit (one full-width tap on a phone)', () => {
    const js = read('public/js/admin-people.js');
    assert.match(js, /function initNameOrderForm\(\)/);
    assert.match(js, /querySelector\('\.people-name-order-form'\)/);
    assert.match(js, /form\.addEventListener\('submit', function \(\) \{[\s\S]{0,200}button\.disabled = true;/);
    assert.match(js, /initNameOrderForm\(\);/);
  });
});
