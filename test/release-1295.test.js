const test = require('node:test');
const assert = require('node:assert/strict');
const s = require('../lib/chabadlibrary-scraper');

function fakeFetch(map) {
  return async (url) => {
    const id = url.split('path=')[1];
    if (!map[id]) throw new Error('404');
    return JSON.stringify({ content: map[id] });
  };
}

test('1.29.5 I6: chabadlibrary original Hebrew by month/day titles', async () => {
  s._idCache.clear();
  const fetchImpl = fakeFetch({
    3700000000: { type: 'children', data: [{ id: 1, heading: '<h2>כסלו</h2>' }, { id: 13, heading: '<h2>חשון</h2>' }, { id: 4, heading: '<h2>אדר א</h2>' }, { id: 5, heading: '<h2>אדר ב</h2>' }] },
    13: { type: 'children', data: [{ id: 257, heading: '<h3>יז חשון</h3>' }, { id: 258, heading: '<h3>יח חשון</h3>' }] },
    5: { type: 'children', data: [{ id: 514, heading: '<h3>יד אדר ב, פורים</h3>' }] },
    258: { type: 'page', data: { text: '<p>בתו&quot;א פ\' חיי שרה</p>' } },
    514: { type: 'page', data: { text: 'פורים' } },
  });
  assert.equal(await s.fetchHebrewAphorism(8, 18, { fetchImpl }), 'בתו"א פ\' חיי שרה');
  assert.equal(await s.fetchHebrewAphorism(13, 14, { fetchImpl }), 'פורים');
  assert.equal(await s.fetchHebrewAphorism(12, 14, { fetchImpl, year: 5785 }), 'פורים'); // non-leap Adar → Adar II
  assert.equal(s.dayToHebrew(15), 'טו');
  assert.equal(s.dayToHebrew(29), 'כט');
});
