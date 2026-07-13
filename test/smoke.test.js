const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const http = require('node:http');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.SMOKE_PORT || 3456);
const BASE = `http://127.0.0.1:${PORT}`;
const SLUG = process.env.SMOKE_SLUG || 'novosibirsk';

let serverProcess = null;

function waitForOutput(child, pattern, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for: ${pattern}`));
    }, timeoutMs);

    const onData = (chunk) => {
      const text = chunk.toString();
      if (pattern.test(text)) {
        clearTimeout(timer);
        child.stdout.off('data', onData);
        child.stderr.off('data', onData);
        resolve(text);
      }
    };

    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Server exited early with code ${code}`));
    });
  });
}

function request(method, urlPath, { headers = {}, body = null, redirect = 'manual' } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE);
    const req = http.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        method,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
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

    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();

    // redirect option kept for API symmetry with fetch; Node http does not auto-follow.
    void redirect;
  });
}

before(async () => {
  serverProcess = spawn(process.execPath, ['app.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: 'test',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  await waitForOutput(serverProcess, /Started at port/);
});

after(async () => {
  if (!serverProcess || serverProcess.killed) {
    return;
  }

  serverProcess.kill('SIGTERM');
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      serverProcess.kill('SIGKILL');
      resolve();
    }, 5000);
    serverProcess.on('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
});

describe('http smoke', () => {
  it('serves landing, board shell, admin and master login', async () => {
    const paths = ['/', `/s/${SLUG}`, '/admin/login', '/master/login'];
    for (const urlPath of paths) {
      const res = await request('GET', urlPath);
      assert.equal(res.status, 200, `${urlPath} should be 200`);
    }
  });

  it('does not expose node_modules', async () => {
    const res = await request('GET', '/node_modules/express/package.json');
    assert.equal(res.status, 404);
  });

  it('returns a public board payload without private fields', async () => {
    const res = await request('GET', `/s/${SLUG}/api/board`);
    assert.equal(res.status, 200);
    const payload = res.json();

    assert.equal(payload.slug, SLUG);
    assert.ok(Array.isArray(payload.people));
    assert.equal(payload.contactDirectory, undefined);
    assert.equal(payload.adminUsers, undefined);
    assert.equal(payload.yahrzeitReminders, undefined);
    assert.equal(payload.provisioning, undefined);
    assert.equal(payload.savedViews, undefined);
    assert.equal(payload.adminPassword, undefined);

    for (const person of payload.people) {
      assert.equal(person.contact, undefined);
      assert.equal(person.contacts, undefined);
      assert.equal(person.text, undefined);
    }
  });

  it('returns person detail without contact fields', async () => {
    const board = await request('GET', `/s/${SLUG}/api/board`);
    const first = board.json().people[0];
    assert.ok(first, 'seeded synagogue should have people');

    const res = await request('GET', `/s/${SLUG}/api/board/person/${first.id}`);
    assert.equal(res.status, 200);
    const person = res.json().person;
    assert.equal(person.id, first.id);
    assert.equal(typeof person.text, 'string');
    assert.equal(person.contact, undefined);
    assert.equal(person.contacts, undefined);
  });

  it('serves board version, sidebar, and jewish content APIs', async () => {
    const version = await request('GET', `/s/${SLUG}/api/board/version`);
    assert.equal(version.status, 200);
    assert.ok(version.json().version);

    const sidebar = await request('GET', `/s/${SLUG}/api/sidebar-app`);
    assert.equal(sidebar.status, 200);
    assert.equal(sidebar.json().slug, SLUG);

    const jewish = await request('GET', `/s/${SLUG}/api/jewish-content?lang=ru`);
    assert.equal(jewish.status, 200);
  });

  it('logs into admin and master panels', async () => {
    const adminBody = 'slug=novosibirsk&password=admin';
    const adminLogin = await request('POST', '/admin/login', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(adminBody),
      },
      body: adminBody,
    });
    assert.equal(adminLogin.status, 302);
    assert.match(adminLogin.headers.location || '', /\/admin\/novosibirsk\/dashboard/);
    assert.ok(adminLogin.headers['set-cookie']);

    const masterBody = `password=${encodeURIComponent(process.env.MASTER_ADMIN_PASSWORD || 'masteradmin')}`;
    const masterLogin = await request('POST', '/master/login', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(masterBody),
      },
      body: masterBody,
    });
    assert.equal(masterLogin.status, 302);
    assert.match(masterLogin.headers.location || '', /\/master\/dashboard/);
  });

  it('embeds sanitized public window.data on the board page', async () => {
    const res = await request('GET', `/s/${SLUG}`);
    assert.equal(res.status, 200);
    assert.match(res.body, /window\.boardContentVersion/);
    const match = res.body.match(/window\.data = (\{[\s\S]*?\});/);
    assert.ok(match, 'board page should embed window.data');
    const data = JSON.parse(match[1]);
    assert.equal(data.contactDirectory, undefined);
    assert.equal(data.adminUsers, undefined);
    assert.equal(data.yahrzeitReminders, undefined);
    assert.equal(data.slideshow, undefined);
    assert.ok(Array.isArray(data.people));
    assert.equal(res.body.includes('\n  \"slug\"'), false, 'window.data should be compact JSON');
  });
});
