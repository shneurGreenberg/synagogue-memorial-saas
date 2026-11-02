const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { cspMiddleware, ADMIN_POLICY } = require('../lib/csp');
const { detectImageType, verifyDiskUpload } = require('../lib/upload-magic');
const { slugLockRemainingMs, recordLoginFailure, recordLoginSuccess, createLoginRateLimiter } = require('../lib/http-security');
const { buildHealthPayload } = require('../lib/health-payload');

function fakeRes() {
  const h = {};
  return { h, getHeader: (k) => h[k], setHeader: (k, v) => { h[k] = v; } };
}

describe('1.33.0 CSP', () => {
  it('enforces on admin, report-only on boards', () => {
    const a = fakeRes(); cspMiddleware({ path: '/admin/x/home' }, a, () => {});
    assert.equal(a.h['Content-Security-Policy'], ADMIN_POLICY);
    assert.match(ADMIN_POLICY, /object-src 'none'/);
    assert.match(ADMIN_POLICY, /frame-ancestors 'self'/);
    const b = fakeRes(); cspMiddleware({ path: '/s/tomsk' }, b, () => {});
    assert.equal(b.h['Content-Security-Policy'], "object-src 'none'; base-uri 'self'");
    assert.ok(b.h['Content-Security-Policy-Report-Only']);
  });
});

describe('1.33.0 upload magic bytes', () => {
  it('detects real types and deletes fakes', () => {
    assert.equal(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0])).ext, '.jpg');
    assert.equal(detectImageType(Buffer.from('<svg xmlns="x"></svg>')).mime, 'image/svg+xml');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'up-'));
    const bad = path.join(dir, 'a.jpg'); fs.writeFileSync(bad, '<?php echo 1;');
    assert.ok(verifyDiskUpload({ path: bad, filename: 'a.jpg', fieldname: 'photo' }));
    assert.equal(fs.existsSync(bad), false);
    const svg = path.join(dir, 'b.jpg'); fs.writeFileSync(svg, '<svg></svg>');
    assert.ok(verifyDiskUpload({ path: svg, filename: 'b.jpg', fieldname: 'photo' }), 'svg only for logos');
    const png = path.join(dir, 'c.jpg'); fs.writeFileSync(png, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0]));
    const f = { path: png, filename: 'c.jpg', fieldname: 'photo' };
    assert.equal(verifyDiskUpload(f), null);
    assert.equal(f.filename, 'c.png');
  });
});

describe('1.33.0 login backoff', () => {
  it('locks a slug after repeated failures and clears on success', () => {
    const now = Date.now();
    for (let i = 0; i < 5; i += 1) recordLoginFailure('slug-x', now);
    assert.ok(slugLockRemainingMs('slug-x', now) > 0);
    recordLoginSuccess('slug-x');
    assert.equal(slugLockRemainingMs('slug-x', now), 0);
    assert.ok(createLoginRateLimiter());
  });
});

describe('1.33.0 healthz', () => {
  it('reports mongo but stays ok', () => {
    const p = buildHealthPayload({ mongo: 0 });
    assert.equal(p.ok, true);
    assert.equal(p.mongo, 'disconnected');
  });
});
