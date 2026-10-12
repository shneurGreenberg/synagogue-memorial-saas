const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// Guards against startup crashes (e.g. duplicate declarations from merges).
test('all server modules pass node --check', () => {
  const root = path.join(__dirname, '..');
  const files = ['app.js', 'server.js'];
  for (const dir of ['routes', 'lib']) {
    for (const f of fs.readdirSync(path.join(root, dir))) {
      if (f.endsWith('.js')) files.push(path.join(dir, f));
    }
  }
  for (const f of files) {
    assert.doesNotThrow(() => execFileSync(process.execPath, ['--check', path.join(root, f)], { stdio: 'pipe' }), f);
  }
});