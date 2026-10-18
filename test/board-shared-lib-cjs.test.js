const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// Regression (1.16/1.17): client imports of CommonJS lib/*.js must be listed in
// vite.board.config.mjs commonjsOptions.include, otherwise the board build fails.
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (/\.(jsx?|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}

test('every shared lib imported by the board is in vite commonjs include', () => {
  const root = path.join(__dirname, '..');
  const libDir = path.join(root, 'lib');
  const config = fs.readFileSync(path.join(root, 'vite.board.config.mjs'), 'utf8');
  const missing = new Set();
  for (const file of walk(path.join(root, 'client', 'src'))) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(/from\s+['"]((?:\.\.\/)+lib\/[\w.-]+?)(?:\.js)?['"]/g)) {
      const target = path.resolve(path.dirname(file), m[1] + '.js');
      if (path.dirname(target) !== libDir || !fs.existsSync(target)) continue;
      if (!/module\.exports|exports\./.test(fs.readFileSync(target, 'utf8'))) continue;
      const name = path.basename(target, '.js');
      const escaped = 'lib\\/' + name.replace(/\./g, '\\.') + '\\.js';
      if (!config.includes(escaped)) missing.add(name);
    }
  }
  assert.deepEqual([...missing], []);
});
