const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');

describe('1.30.2: ?scale= board scaling', async () => {
  const { parseScale, resolveScale, SCALE_STORAGE_KEY } = await import('../client/src/lib/board-scale.js');
  const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
  it('parses and clamps', () => {
    assert.equal(parseScale('0.6'), 0.6);
    assert.equal(parseScale('0,7'), 0.7);
    assert.equal(parseScale('0.1'), 0.3);
    assert.equal(parseScale('9'), 1.5);
    assert.equal(parseScale('abc'), null);
    assert.equal(parseScale(''), null);
  });
  it('URL wins and persists; stored value used without param', () => {
    const s = mem();
    assert.equal(resolveScale('?scale=0.6', s), 0.6);
    assert.equal(s.getItem(SCALE_STORAGE_KEY), '0.6');
    assert.equal(resolveScale('', s), 0.6);
    assert.equal(resolveScale('?scale=0.8', s), 0.8);
    assert.equal(resolveScale('?scale=1', s), 1);
    assert.equal(s.getItem(SCALE_STORAGE_KEY), null);
  });
  it('is wired in main.jsx and the styles keep desktop layout when scaled', () => {
    const root = path.join(__dirname, '..');
    assert.match(fs.readFileSync(path.join(root, 'client/src/main.jsx'), 'utf8'), /applyBoardScale\(\)/);
    const scss = fs.readFileSync(path.join(root, 'styles/home.scss'), 'utf8');
    assert.match(scss, /html\.board-scaled--transform #root/);
    assert.match(scss, /html:not\(\.board-scaled\)/);
  });
});
