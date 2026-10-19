const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// Regression (1.16+): client imports of CommonJS lib/*.js (and their transitive requires)
// must be transformed by vite.board.config.mjs commonjsOptions.include.

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(jsx?|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}

function isCommonJsLibFile(filePath, libDir) {
  if (path.dirname(filePath) !== libDir || !fs.existsSync(filePath)) {
    return false;
  }
  const src = fs.readFileSync(filePath, 'utf8');
  return /module\.exports|exports\./.test(src);
}

function collectTransitiveLibRequires(entryPath, libDir, seen = new Set()) {
  if (!isCommonJsLibFile(entryPath, libDir)) {
    return seen;
  }
  const key = path.basename(entryPath, '.js');
  if (seen.has(key)) {
    return seen;
  }
  seen.add(key);
  const src = fs.readFileSync(entryPath, 'utf8');
  for (const m of src.matchAll(/require\s*\(\s*['"](\.\/[^'"]+)['"]\s*\)/g)) {
    const dep = path.resolve(path.dirname(entryPath), m[1] + (m[1].endsWith('.js') ? '' : '.js'));
    collectTransitiveLibRequires(dep, libDir, seen);
  }
  return seen;
}

function boardClientLibImports(root) {
  const libDir = path.join(root, 'lib');
  const imports = new Set();
  for (const file of walk(path.join(root, 'client', 'src'))) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(/from\s+['"]((?:\.\.\/)+lib\/[\w.-]+?)(?:\.js)?['"]/g)) {
      const target = path.resolve(path.dirname(file), `${m[1]}.js`);
      if (path.dirname(target) === libDir && fs.existsSync(target)) {
        imports.add(target);
      }
    }
  }
  return { libDir, imports };
}

test('vite commonjs include covers all board-reachable CommonJS lib modules', () => {
  const root = path.join(__dirname, '..');
  const config = fs.readFileSync(path.join(root, 'vite.board.config.mjs'), 'utf8');
  assert.match(
    config,
    /lib[/\\][^/\\]+\.js/,
    'vite.board.config.mjs must transform all lib/*.js CommonJS (transitive requires)',
  );

  const { libDir, imports } = boardClientLibImports(root);
  const reachable = new Set();
  for (const entry of imports) {
    for (const name of collectTransitiveLibRequires(entry, libDir)) {
      reachable.add(name);
    }
  }
  assert.ok(reachable.size > 0, 'expected at least one shared lib import from client');
});
