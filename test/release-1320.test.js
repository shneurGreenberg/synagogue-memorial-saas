const test = require('node:test');
const assert = require('node:assert');
const { normalizePrayerTimes, parsePrayerTimesFromBody, normalizeSectionTitles, defaultSectionTitles, prayerTimeRowsForAdmin } = require('../lib/board-mode');

test('1.32.0 I39: prayers first, then classes; existing rows default to prayers', () => {
  const rows = normalizePrayerTimes([
    { label: 'שיעור', time: '20:30', kind: 'class' },
    { label: 'שחרית', time: '7:00' },
    { label: 'ערבית', time: '20:00', kind: 'prayer' },
  ]);
  assert.deepStrictEqual(rows.map((r) => [r.label, r.kind]), [['שחרית', 'prayer'], ['ערבית', 'prayer'], ['שיעור', 'class']]);
});

test('1.32.0 I39: parse kind from the form body', () => {
  const rows = parsePrayerTimesFromBody({ prayerLabel_0: 'א', prayerTime_0: '08:00', prayerKind_0: 'class', prayerLabel_1: 'ב', prayerTime_1: '09:00' });
  assert.deepStrictEqual(rows.map((r) => r.kind), ['prayer', 'class']);
  const admin = prayerTimeRowsForAdmin({ prayerTimes: rows, language: 'he' });
  assert.strictEqual(admin.filter((r) => r.isClass).length, 1);
});

test('1.32.0 I38: section titles normalize, defaults per language', () => {
  // 1.34.0 I46/I51: the classes heading replaced the announcements heading.
  assert.deepStrictEqual(normalizeSectionTitles({ prayers: '  זמנים  ' }), { prayers: 'זמנים', classes: '', zmanim: '' });
  assert.strictEqual(defaultSectionTitles('he').zmanim, 'זמני היום');
});
