const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildHealthPayload } = require('../lib/health-payload');

describe('release 1.25.3 Node 24.22.1 toolchain', () => {
  it('pins Node 24.22.1 in Amvera, Docker, and CI', () => {
    const amvera = fs.readFileSync(path.join(__dirname, '..', 'amvera.yaml'), 'utf8');
    const docker = fs.readFileSync(path.join(__dirname, '..', 'Dockerfile'), 'utf8');
    const ci = fs.readFileSync(
      path.join(__dirname, '..', '.github', 'workflows', 'test.yml'),
      'utf8',
    );
    assert.match(amvera, /version:\s*"24\.22\.1"/);
    assert.match(docker, /node:24\.22\.1-bookworm-slim/);
    assert.match(ci, /node-version:\s*'24\.22\.1'/);
  });

  it('requires Node >=24.22.1 in package.json engines', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    assert.equal(pkg.engines.node, '>=24.22.1');
  });
});

describe('release 1.25.3 public health endpoint', () => {
  it('exposes GET /healthz in app.js', () => {
    const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
    assert.match(appSource, /app\.get\('\/healthz'/);
  });

  it('returns JSON with node runtime and app version only', () => {
    const payload = buildHealthPayload();
    assert.equal(payload.ok, true);
    assert.match(payload.node, /^v\d+\.\d+\.\d+/);
    assert.match(payload.version, /^\d+\.\d+\.\d+$/);
    assert.deepEqual(Object.keys(payload).sort(), ['node', 'ok', 'version']);
  });
});

describe('release 1.25.3 changelog version', () => {
  it('includes 1.25.3 in CHANGELOG.json', () => {
    const changelog = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.json'), 'utf8'),
    );
    assert.ok(changelog.some((entry) => entry.version === '1.25.3'));
  });
});
