const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('1.29.6: each combined-board box scrolls its own content', () => {
  const src = fs.readFileSync(path.join(__dirname, '../client/src/components/SynagogueInfoPanel.jsx'), 'utf8');
  assert.ok(!src.includes('synagogue-info-col--scroll'));
  assert.strictEqual((src.match(/synagogue-info-box-scroll/g) || []).length, 3);
  assert.match(src, /useLoopScroll\(zmanimRef/);
  assert.match(src, /useLoopScroll\(prayersRef/);
  assert.match(src, /useAutoScroll\(announcementRef/);
  const css = fs.readFileSync(path.join(__dirname, '../styles/home.scss'), 'utf8');
  assert.match(css, /\.synagogue-info-box-scroll \{[^}]*overflow: hidden/);
});

test('1.29.6 I8: combined text-size controls live with typography settings', () => {
  const v = fs.readFileSync(path.join(__dirname, '../views/admin/dashboard.handlebars'), 'utf8');
  const typo = v.indexOf('settings-typography-controls');
  const grp = v.indexOf('combinedTextSizeGroup');
  const prayer = v.indexOf('id="prayerTimesSettings"');
  assert.ok(typo > 0 && grp > typo && grp < prayer);
  assert.match(v, /name="combinedInfoScale"/);
  assert.match(v, /name="combinedAnnouncementScale"/);
});

test('1.29.6 I9: combined top half is a fixed 8, no rotation', async () => {
  const { combinedSlots } = await import('../client/src/lib/zmanim.js');
  const people = Array.from({ length: 20 }, (_, i) => ({ id: i, passedToday: i === 5 }));
  const a = combinedSlots(people, 8);
  assert.deepStrictEqual(a.map((p) => p.id), [5, 0, 1, 2, 3, 4, 6, 7]);
  const src = fs.readFileSync(path.join(__dirname, '../client/src/pages/HomePage.jsx'), 'utf8');
  assert.ok(!src.includes('combinedTick'));
});
