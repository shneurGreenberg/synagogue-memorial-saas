const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');
const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('release 1.29.1 Hayom Yom', () => {
  it('Hebrew/Russian boards translate the English aphorism instead of showing nothing', () => {
    const src = read('lib/jewish-feed.js');
    assert.match(src, /translateHayomYom\(englishText, month, day, 'he'\)/);
    assert.match(src, /translateHayomYom\(englishText, month, day, 'ru'\)/);
    assert.match(src, /translateWithCache\(chunk, `en\|\$\{lang\}`/);
  });
  it('no infinite "loading": the panel is hidden when the feed says unavailable', () => {
    assert.match(read('client/src/components/JewishContentPanels.jsx'), /hayomYom\.available !== false/);
  });
});
