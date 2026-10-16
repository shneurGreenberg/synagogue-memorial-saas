const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const bodyParser = require('body-parser');

const SESSION_SLUG = 'community-alpha';
const TARGET_SLUG = 'community-beta';

function requestWithTimeout(server, options, body, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout ${timeoutMs}ms`)), timeoutMs);
    const address = server.address();
    const req = http.request(
      { hostname: '127.0.0.1', port: address.port, ...options },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          clearTimeout(timer);
          const buffer = Buffer.concat(chunks);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: buffer.toString('utf8'),
            json() { return JSON.parse(buffer.toString('utf8')); },
          });
        });
      },
    );
    req.on('error', (err) => { clearTimeout(timer); reject(err); });
    if (body) req.write(body);
    req.end();
  });
}

function buildTenantAdminApp() {
  const synagogueLoad = require('../lib/admin-synagogue-load');
  synagogueLoad.loadAdminSynagogue = async (slug) => ({
    slug,
    titles: { he: `Title ${slug}`, ru: slug, en: slug },
    theme: { logo: `${slug}-logo.png` },
    people: [{ id: 1, name: `Person-${slug}` }],
    savedViews: [{ id: 'v1', name: `View-${slug}` }],
    adminUsers: [],
    language: 'he',
    adminLanguage: 'he',
  });
  synagogueLoad.invalidateAdminSynagogueCache = () => {};

  const Synagogue = require('../models/Synagogue');
  const updates = [];
  Synagogue.updateOne = async (filter, update) => {
    updates.push({ filter, update });
    return { acknowledged: true };
  };
  Synagogue.findOne = async ({ slug }) => ({
    slug,
    slideshow: { images: [] },
    markModified() {},
    save: async () => {},
  });

  delete require.cache[require.resolve('../routes/admin.js')];
  const adminRoutes = require('../routes/admin');

  const app = express();
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use((req, res, next) => {
    req.session = { adminSlug: SESSION_SLUG, adminUsername: null };
    next();
  });
  app.use('/admin', adminRoutes);
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    if (req.get('X-Requested-With') === 'XMLHttpRequest') {
      return res.status(status).json({ ok: false, error: err.message });
    }
    return res.status(status).send(err.message);
  });

  return { app, updates };
}

describe('invariant: admin tenant isolation', () => {
  let server;
  let updates;

  before(async () => {
    const built = buildTenantAdminApp();
    updates = built.updates;
    server = http.createServer(built.app);
    await new Promise((resolve) => server.listen(0, resolve));
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  it('returns wrong_community JSON for AJAX on foreign slug', async () => {
    const body = new URLSearchParams({ eventTitle: 'Hack', publishNow: '1' }).toString();
    const res = await requestWithTimeout(server, {
      method: 'POST',
      path: `/admin/${TARGET_SLUG}/events/add`,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    }, body);

    assert.equal(res.status, 403);
    assert.equal(res.json().error, 'wrong_community');
    assert.ok(res.json().loginUrl.includes(TARGET_SLUG));
    const touchedBeta = updates.some((u) => u.filter && u.filter.slug === TARGET_SLUG);
    assert.equal(touchedBeta, false);
  });

});
