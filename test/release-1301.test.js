const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

describe('1.30.1 I17: preview-panel settings are hidden from the regular sections', () => {
  const js = read('public/js/admin-preview-editor.js');
  it('hides covered fields but keeps toggles and board mode', () => {
    assert.match(js, /preview-covered/);
    assert.match(js, /KEEP_IN_FORM = \{ boardMode: true \}/);
    assert.match(js, /real\.type === 'checkbox'/);
    assert.match(js, /previewEditToggle/);
  });
});

describe('1.30.1 I18: zmanim + prayers side by side', () => {
  it('uses a side-by-side row with one loop per column', () => {
    const jsx = read('client/src/components/SynagogueInfoPanel.jsx');
    assert.match(jsx, /synagogue-info-col--side-by-side/);
    assert.equal((jsx.match(/useLoopScroll\(/g) || []).length, 3);
    assert.match(read('styles/home.scss'), /synagogue-info-col--side-by-side \{\s*flex-direction: row/);
  });
});

describe('1.30.1 I19: stable board while offline', async () => {
  const { backoffDelayMs, keepLastGood } = await import('../client/src/lib/network-backoff.js');
  it('backs off exponentially with a cap', () => {
    assert.equal(backoffDelayMs(0), 30000);
    assert.equal(backoffDelayMs(1), 60000);
    assert.equal(backoffDelayMs(3), 240000);
    assert.equal(backoffDelayMs(50), 30 * 60 * 1000);
  });
  it('keeps the last good value on a failed refresh', () => {
    assert.deepEqual(keepLastGood({ a: 1 }, null), { a: 1 });
    assert.deepEqual(keepLastGood({ a: 1 }, { a: 2 }), { a: 2 });
  });
  it('shabbat times keep last data and idle reload skips offline', () => {
    const shabbat = read('client/src/components/ShabbatTimes.jsx');
    assert.match(shabbat, /if \(next\) \{/);
    assert.match(shabbat, /backoffDelayMs/);
    assert.match(read('client/src/components/IdleReload.jsx'), /!isBrowserOffline\(\)/);
  });
});
