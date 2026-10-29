const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('1.29.6: each combined-board box scrolls its own content', () => {
  const src = fs.readFileSync(path.join(__dirname, '../client/src/components/SynagogueInfoPanel.jsx'), 'utf8');
  assert.ok(!src.includes('synagogue-info-col--scroll'));
  assert.strictEqual((src.match(/synagogue-info-box-scroll/g) || []).length, 3);
  assert.match(src, /useAutoScroll\(zmanimRef/);
  assert.match(src, /useAutoScroll\(prayersRef/);
  assert.match(src, /useAutoScroll\(announcementRef/);
  const css = fs.readFileSync(path.join(__dirname, '../styles/home.scss'), 'utf8');
  assert.match(css, /\.synagogue-info-box-scroll \{[^}]*overflow: hidden/);
});
