#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const assetsDir = path.join(__dirname, '..', 'public', 'board', 'assets');
const memorialPath = path.join(assetsDir, 'memorial.js');

assert.ok(fs.existsSync(memorialPath), 'memorial.js missing — run npm run build:board first');

const offenders = [];
for (const name of fs.readdirSync(assetsDir)) {
  if (!name.endsWith('.js')) continue;
  const filePath = path.join(assetsDir, name);
  const src = fs.readFileSync(filePath, 'utf8');
  if (/\brequire\s*\(/.test(src)) {
    offenders.push(name);
  }
}
assert.deepEqual(offenders, [], 'browser bundle must not contain CommonJS require()');
