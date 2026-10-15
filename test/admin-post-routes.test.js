const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const bodyParser = require('body-parser');
const SLUG = 'test-admin-post';

const mockSynagogueDoc = {
  slug: SLUG,
  communityEvents: [],
  slideshow: {
    enabled: true,
    displayMode: 'rotate',
    interval: 10,
    mainDuration: 30,
    images: [],
  },
  adminUsers: [],
  savedViews: [],
  activeSavedViewId: '',
  adminLanguage: 'he',
  language: 'he',
  theme: {},
  titles: { ru: 'Test', en: 'Test', he: 'Test' },
};

function multipart(fields, file) {
  const boundary = '----adminpost';
  const chunks = [];
  Object.entries(fields).forEach(([name, value]) => {
    chunks.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
    ));
  });
  if (file) {
    chunks.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${file.field}"; filename="${file.filename}"\r\nContent-Type: ${file.mime}\r\n\r\n`,
    ));
    chunks.push(file.data);
    chunks.push(Buffer.from('\r\n'));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    body: Buffer.concat(chunks),
  };
}

function requestWithTimeout(server, options, body, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

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
          clearTimeout(timer);
          const buffer = Buffer.concat(chunks);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: buffer.toString('utf8'),
            json() {
              return JSON.parse(buffer.toString('utf8'));
            },
          });
        });
      },
    );
    req.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

function buildAdminApp() {
  const synagogueLoad = require('../lib/admin-synagogue-load');
  synagogueLoad.loadAdminSynagogue = async () => ({ ...mockSynagogueDoc });
  synagogueLoad.invalidateAdminSynagogueCache = () => {};

  const Synagogue = require('../models/Synagogue');
  Synagogue.updateOne = async () => ({ acknowledged: true, modifiedCount: 1 });
  Synagogue.findOne = async () => ({
    slug: SLUG,
    slideshow: { images: [] },
    markModified() {},
    save: async () => {},
  });

  const imageOptimize = require('../lib/image-optimize');
  imageOptimize.storeUploadedImageOriginal = () => 'slide-test.jpg';

  delete require.cache[require.resolve('../routes/admin.js')];
  const adminRoutes = require('../routes/admin');

  const app = express();
  app.use(bodyParser.urlencoded({ extended: true, limit: '2mb' }));
  app.use(bodyParser.json({ limit: '2mb' }));
  app.use((req, res, next) => {
    req.session = { adminSlug: SLUG, adminUsername: null };
    next();
  });
  app.use('/admin', adminRoutes);
  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    if (req.get('X-Requested-With') === 'XMLHttpRequest') {
      return res.status(status).json({ ok: false, error: err.message || 'error' });
    }
    return res.status(status).send(err.message || 'error');
  });

  return app;
}

describe('admin POST routes complete within timeout', () => {
  let server;

  before(async () => {
    const app = buildAdminApp();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
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

  it('slideshow settings (urlencoded)', async () => {
    const params = new URLSearchParams({
      slideshowMode: 'rotate',
      interval: '12',
      mainDuration: '25',
    });
    const body = params.toString();
    const res = await requestWithTimeout(server, {
      method: 'POST',
      path: `/admin/${SLUG}/slideshow/settings`,
      headers: {
        ...ajaxHeaders,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Content-Length': Buffer.byteLength(body),
      },
    }, body);

    assert.equal(res.status, 200);
    assert.equal(res.json().ok, true);
  });

  it('slideshow settings (multipart fields)', async () => {
    const { contentType, body } = multipart({
      slideshowMode: 'showNow',
      interval: '8',
      mainDuration: '20',
    });
    const res = await requestWithTimeout(server, {
      method: 'POST',
      path: `/admin/${SLUG}/slideshow/settings`,
      headers: {
        ...ajaxHeaders,
        'Content-Type': contentType,
        'Content-Length': body.length,
      },
    }, body);

    assert.equal(res.status, 200);
    assert.equal(res.json().ok, true);
  });

  it('slideshow image upload (multipart file)', async () => {
    const tinyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    const { contentType, body } = multipart({}, {
      field: 'image',
      filename: 'dot.png',
      mime: 'image/png',
      data: tinyPng,
    });
    const res = await requestWithTimeout(server, {
      method: 'POST',
      path: `/admin/${SLUG}/slideshow/add`,
      headers: {
        ...ajaxHeaders,
        'Content-Type': contentType,
        'Content-Length': body.length,
      },
    }, body);

    assert.equal(res.status, 200);
    assert.equal(res.json().ok, true);
  });

  it('events add with publish now (urlencoded)', async () => {
    const params = new URLSearchParams({
      eventTitle: 'Test event',
      eventText: 'Body',
      publishNow: '1',
    });
    const body = params.toString();
    const res = await requestWithTimeout(server, {
      method: 'POST',
      path: `/admin/${SLUG}/events/add`,
      headers: {
        ...ajaxHeaders,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Content-Length': Buffer.byteLength(body),
      },
    }, body);

    assert.equal(res.status, 200);
    assert.equal(res.json().ok, true);
  });

  it('events publish-now (urlencoded)', async () => {
    const params = new URLSearchParams({ eventId: '507f1f77bcf86cd799439011' });
    const body = params.toString();
    const res = await requestWithTimeout(server, {
      method: 'POST',
      path: `/admin/${SLUG}/events/publish-now`,
      headers: {
        ...ajaxHeaders,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Content-Length': Buffer.byteLength(body),
      },
    }, body);

    assert.equal(res.status, 200);
    assert.equal(res.json().ok, true);
  });

  it('my-preferences color mode (multipart FormData-style)', async () => {
    const { contentType, body } = multipart({
      adminLanguage: 'he',
      colorMode: 'light',
    });
    const res = await requestWithTimeout(server, {
      method: 'POST',
      path: `/admin/${SLUG}/my-preferences`,
      headers: {
        ...ajaxHeaders,
        'Content-Type': contentType,
        'Content-Length': body.length,
      },
    }, body);

    assert.equal(res.status, 200);
    const payload = res.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.colorMode, 'light');
  });

  it('my-preferences color mode (urlencoded)', async () => {
    const params = new URLSearchParams({
      adminLanguage: 'he',
      colorMode: 'dark',
    });
    const body = params.toString();
    const res = await requestWithTimeout(server, {
      method: 'POST',
      path: `/admin/${SLUG}/my-preferences`,
      headers: {
        ...ajaxHeaders,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Content-Length': Buffer.byteLength(body),
      },
    }, body);

    assert.equal(res.status, 200);
    assert.equal(res.json().colorMode, 'dark');
  });

  it('rejects multipart without boundary instead of hanging', async () => {
    const res = await requestWithTimeout(server, {
      method: 'POST',
      path: `/admin/${SLUG}/slideshow/settings`,
      headers: {
        ...ajaxHeaders,
        'Content-Type': 'multipart/form-data',
        'Content-Length': 0,
      },
    }, null, 2000);

    assert.ok(res.status >= 400);
    assert.equal(res.json().ok, false);
  });
});
