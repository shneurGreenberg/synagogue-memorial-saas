const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {
  compareVersions, normalizeChangelog, loadChangelog, currentCodeVersion, hasUnseenRelease,
} = require('../lib/changelog');

test('compareVersions orders semver-like strings', () => {
  assert.strictEqual(compareVersions('1.10.0', '1.9.0'), 1);
  assert.strictEqual(compareVersions('1.2', '1.2.0'), 0);
  assert.strictEqual(compareVersions('1.0.0', '1.0.1'), -1);
});

test('CHANGELOG.json is valid, newest first, Hebrew items with known types', () => {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.json'), 'utf8'));
  assert.ok(raw.length > 0);
  for (let i = 1; i < raw.length; i += 1) {
    assert.strictEqual(compareVersions(raw[i - 1].version, raw[i].version), 1, 'must be newest first');
  }
  for (const entry of raw) {
    assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(entry.items.length > 0);
    for (const item of entry.items) {
      assert.ok(['added', 'fixed', 'changed'].includes(item.type));
      assert.match(item.text, /[\u0590-\u05FF]/);
    }
  }
  assert.strictEqual(currentCodeVersion(), raw[0].version);
  assert.strictEqual(loadChangelog().length, raw.length);
});

test('normalizeChangelog sorts and drops bad entries', () => {
  const list = normalizeChangelog([
    { version: '1.0.0', items: [{ type: 'x', text: 'a' }] },
    { version: 'bad' },
    { version: '2.0.0', items: [] },
  ]);
  assert.deepStrictEqual(list.map((e) => e.version), ['2.0.0', '1.0.0']);
  assert.strictEqual(list[1].items[0].type, 'changed');
});

test('hasUnseenRelease only when code is newer than last refresh', () => {
  assert.strictEqual(hasUnseenRelease(null, '1.4.0'), true);
  assert.strictEqual(hasUnseenRelease('1.3.0', '1.4.0'), true);
  assert.strictEqual(hasUnseenRelease('1.4.0', '1.4.0'), false);
  assert.strictEqual(hasUnseenRelease('1.5.0', '1.4.0'), false);
});
