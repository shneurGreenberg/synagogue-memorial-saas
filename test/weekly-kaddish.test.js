const test = require('node:test');
const assert = require('node:assert');
const {
  WHATSAPP_MESSAGE_INTRO, getKaddishWeek, getWeeklyKaddishEntries, buildWeeklyKaddishMessage,
  buildWhatsappUrl, normalizeWhatsappNumber, isWeekConfirmed,
} = require('../lib/weekly-kaddish');

const NOW = new Date('2026-10-14T10:00:00Z'); // Wednesday
const syn = (people) => ({
  location: { timezone: 'Asia/Jerusalem' },
  yahrzeitReminders: { includeHebrewYahrzeit: false },
  people,
});

test('week runs Sunday through Shabbat', () => {
  const w = getKaddishWeek('Asia/Jerusalem', NOW);
  assert.strictEqual(w.weekKey, '2026-10-11');
  assert.strictEqual(w.days.length, 7);
  assert.strictEqual(w.start.getDay(), 0);
  assert.strictEqual(w.end.getDay(), 6);
  assert.strictEqual(w.end.getDate(), 17);
});

test('Sunday and Shabbat themselves map to the same week', () => {
  assert.strictEqual(getKaddishWeek('Asia/Jerusalem', new Date('2026-10-11T05:00:00Z')).weekKey, '2026-10-11');
  assert.strictEqual(getKaddishWeek('Asia/Jerusalem', new Date('2026-10-17T18:00:00Z')).weekKey, '2026-10-11');
  // 22:30 UTC Saturday is already Sunday in Jerusalem -> next week
  assert.strictEqual(getKaddishWeek('Asia/Jerusalem', new Date('2026-10-17T22:30:00Z')).weekKey, '2026-10-18');
});

test('includes Shabbat, excludes outside days and undated people', () => {
  const r = getWeeklyKaddishEntries(syn([
    { id: 1, name: 'Shabbat', gregorianDateOfDeath: { year: 2020, month: 10, date: 17 }, contact: { name: 'Son', phone: '+972501' } },
    { id: 2, name: 'Sunday', gregorianDateOfDeath: { year: 2019, month: 10, date: 11 } },
    { id: 3, name: 'PrevSat', gregorianDateOfDeath: { year: 2020, month: 10, date: 10 } },
    { id: 4, name: 'NextSun', gregorianDateOfDeath: { year: 2020, month: 10, date: 18 } },
    { id: 5, name: 'Undated', gregorianDateOfDeath: {} },
  ]), NOW);
  assert.deepStrictEqual(r.entries.map((e) => e.name), ['Sunday', 'Shabbat']);
  const shabbat = r.entries.find((e) => e.id === 1);
  assert.strictEqual(shabbat.isShabbat, true);
  assert.strictEqual(shabbat.weekdayHe, 'שבת');
  assert.strictEqual(shabbat.gregorianLabel, '17/10');
  assert.strictEqual(shabbat.searchQuery, encodeURIComponent('Shabbat'));
});

test('searchQuery is URL-encoded for people list links', () => {
  const r = getWeeklyKaddishEntries(syn([
    { id: 1, name: 'משה כהן', gregorianDateOfDeath: { year: 2020, month: 10, date: 12 } },
  ]), NOW);
  assert.strictEqual(r.entries[0].searchQuery, encodeURIComponent('משה כהן'));
});

test('flags missing contacts', () => {
  const r = getWeeklyKaddishEntries(syn([
    { id: 1, name: 'A', gregorianDateOfDeath: { year: 2020, month: 10, date: 12 }, contacts: [{ name: 'Only name' }] },
    { id: 2, name: 'B', gregorianDateOfDeath: { year: 2020, month: 10, date: 13 }, contacts: [{ name: 'X', phone: '123' }] },
  ]), NOW);
  assert.strictEqual(r.entries[0].missingContact, true);
  assert.strictEqual(r.entries[1].missingContact, false);
  assert.strictEqual(r.missingCount, 1);
});

test('builds Hebrew message and wa.me url', () => {
  const r = getWeeklyKaddishEntries(syn([
    { id: 1, name: 'משה כהן', gregorianDateOfDeath: { year: 2020, month: 10, date: 17 }, contact: { name: 'דוד', phone: '+972-50-1234567' } },
    { id: 2, name: 'שרה', gregorianDateOfDeath: { year: 2020, month: 10, date: 12 } },
  ]), NOW);
  const msg = buildWeeklyKaddishMessage(r.entries);
  const lines = msg.split('\n');
  assert.strictEqual(lines[0], WHATSAPP_MESSAGE_INTRO);
  assert.ok(msg.includes('1. שרה – יום שני 12/10'));
  assert.ok(msg.includes('2. משה כהן – יום שבת 17/10'));
  assert.ok(msg.includes('איש קשר: דוד – +972-50-1234567'));
  assert.ok(msg.includes('איש קשר: אין פרטים'));
  assert.strictEqual(normalizeWhatsappNumber('+972 50-123-4567'), '972501234567');
  assert.strictEqual(buildWhatsappUrl('', msg), '');
  assert.strictEqual(buildWhatsappUrl('+972501234567', 'a b'), 'https://wa.me/972501234567?text=a%20b');
});

test('weekly confirmation matches week key', () => {
  const s = { weeklyKaddishConfirmation: { weekKey: '2026-10-11', confirmedBy: 'x', confirmedAt: new Date() } };
  assert.strictEqual(isWeekConfirmed(s, '2026-10-11'), true);
  assert.strictEqual(isWeekConfirmed(s, '2026-10-18'), false);
});
