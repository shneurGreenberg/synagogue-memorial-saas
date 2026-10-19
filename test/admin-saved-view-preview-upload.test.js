const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const {
  MAX_SAVED_VIEW_PREVIEW_BYTES,
  parsePreviewDataUrl,
  saveSavedViewPreviewFromDataUrl,
} = require('../lib/saved-view-preview-upload');

const SLUG = 'preview-upload-shul';
const VIEW_ID = 'view-abc-123';
const OTHER_SLUG = 'other-shul';

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

function requestJson(server, options, body) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: address.port,
        ...options,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let data = {};
          try {
            data = JSON.parse(text);
          } catch (err) {
            data = { raw: text };
          }
          resolve({ status: res.statusCode, data });
        });
      },
    );
    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

describe('saved view preview upload (Z10)', () => {
  it('parsePreviewDataUrl rejects invalid mime and oversize payloads', () => {
    assert.equal(parsePreviewDataUrl(''), null);
    assert.equal(parsePreviewDataUrl('data:text/plain;base64,YQ=='), null);
    const huge = Buffer.alloc(MAX_SAVED_VIEW_PREVIEW_BYTES + 1, 1);
    assert.equal(
      parsePreviewDataUrl(`data:image/jpeg;base64,${huge.toString('base64')}`),
      null,
    );
    const ok = parsePreviewDataUrl(`data:image/png;base64,${tinyPng.toString('base64')}`);
    assert.ok(ok && ok.buffer.length === tinyPng.length);
  });

  it('saveSavedViewPreviewFromDataUrl writes under saved-views', async () => {
    const dataUrl = `data:image/png;base64,${tinyPng.toString('base64')}`;
    const result = await saveSavedViewPreviewFromDataUrl(dataUrl);
    assert.equal(result.ok, true);
    assert.match(result.screenshot, /^saved-views\//);
    const filePath = path.join(__dirname, '..', 'images', result.screenshot);
    assert.ok(fs.existsSync(filePath));
    fs.unlinkSync(filePath);
  });

  describe('preview-image route', () => {
    let server;
    let updatePayload;

    before(async () => {
      const synagogueLoad = require('../lib/admin-synagogue-load');
      synagogueLoad.loadAdminSynagogue = async (slug) => (
        slug === SLUG
          ? {
            slug: SLUG,
            adminUsers: [],
            savedViews: [{
              id: VIEW_ID,
              name: 'Classic',
              screenshot: 'saved-views/old.jpg',
              snapshot: { theme: { primaryColor: '#cfaf1f' } },
            }],
          }
          : { slug, adminUsers: [], savedViews: [] }
      );
      synagogueLoad.invalidateAdminSynagogueCache = () => {};

      const savedViewsLib = require('../lib/saved-views');
      savedViewsLib.savedViewsNeedRepair = () => false;
      savedViewsLib.repairSavedViewsInDb = async () => false;

      const Synagogue = require('../models/Synagogue');
      Synagogue.findOne = async ({ slug }) => (
        slug === SLUG
          ? {
            slug: SLUG,
            savedViews: [{
              id: VIEW_ID,
              name: 'Classic',
              screenshot: 'saved-views/old.jpg',
              snapshot: { theme: { primaryColor: '#cfaf1f' } },
            }],
          }
          : null
      );
      Synagogue.updateOne = async (_query, update) => {
        updatePayload = update;
        return { acknowledged: true };
      };

      delete require.cache[require.resolve('../routes/admin.js')];
      const adminRoutes = require('../routes/admin');

      const app = express();
      app.use(bodyParser.json({ limit: '3mb' }));
      app.use((req, res, next) => {
        req.session = { adminSlug: SLUG, adminUsername: null };
        next();
      });
      app.use('/admin', adminRoutes);
      app.use((err, req, res, next) => {
        const status = err.status || err.statusCode || 500;
        return res.status(status).json({ ok: false, error: err.message || 'error' });
      });

      server = await new Promise((resolve) => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
      });
    });

    after(async () => {
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
    });

    const ajaxHeaders = {
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json',
    };

    it('rejects wrong tenant slug', async () => {
      const body = JSON.stringify({
        imageDataUrl: `data:image/png;base64,${tinyPng.toString('base64')}`,
      });
      const res = await requestJson(server, {
        method: 'POST',
        path: `/admin/${OTHER_SLUG}/settings/saved-views/${VIEW_ID}/preview-image`,
        headers: {
          ...ajaxHeaders,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      }, body);
      assert.equal(res.status, 403);
    });

    it('rejects invalid image payload', async () => {
      const body = JSON.stringify({ imageDataUrl: 'not-an-image' });
      const res = await requestJson(server, {
        method: 'POST',
        path: `/admin/${SLUG}/settings/saved-views/${VIEW_ID}/preview-image`,
        headers: {
          ...ajaxHeaders,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      }, body);
      assert.equal(res.status, 400);
      assert.equal(res.data.error, 'invalid_image');
    });

    it('stores preview for the saved view', async () => {
      const body = JSON.stringify({
        imageDataUrl: `data:image/png;base64,${tinyPng.toString('base64')}`,
      });
      const res = await requestJson(server, {
        method: 'POST',
        path: `/admin/${SLUG}/settings/saved-views/${VIEW_ID}/preview-image`,
        headers: {
          ...ajaxHeaders,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      }, body);
      assert.equal(res.status, 200);
      assert.equal(res.data.ok, true);
      assert.match(res.data.screenshot, /^saved-views\//);
      assert.equal(updatePayload.$set.savedViews[0].id, VIEW_ID);
      assert.equal(updatePayload.$set.savedViews[0].screenshot, res.data.screenshot);

      const filePath = path.join(__dirname, '..', 'images', res.data.screenshot);
      assert.ok(fs.existsSync(filePath));
      fs.unlinkSync(filePath);
    });
  });
});
