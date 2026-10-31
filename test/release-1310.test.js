const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function memoryStorage() {
  const map = new Map();
  return {
    get length() { return map.size; },
    key: (i) => Array.from(map.keys())[i] ?? null,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    _map: map,
  };
}

async function bundle(entry) {
  const esbuild = require('esbuild');
  const out = path.join(os.tmpdir(), `kadish-test-${path.basename(entry)}-${process.pid}.mjs`);
  await esbuild.build({ entryPoints: [path.join(root, entry)], bundle: true, format: 'esm', platform: 'neutral', outfile: out, logLevel: 'silent', mainFields: ['module', 'main'] });
  return import(`${out}?t=${Date.now()}`);
}

describe('1.31.0 I25: offline board keeps a month of content and survives a day change', () => {
  let feed;
  const fetchLog = [];
  let online = true;
  before(async () => {
    global.window = { localStorage: memoryStorage(), data: {} };
    global.fetch = async (url) => {
      fetchLog.push(url);
      if (!online) throw new TypeError('Failed to fetch');
      const u = new URL(url, 'http://x');
      if (u.pathname.endsWith('/range')) {
        const from = u.searchParams.get('from');
        const n = Number(u.searchParams.get('days'));
        const days = {};
        for (let i = 0; i < n; i += 1) {
          const d = new Date(`${from}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + i);
          const k = d.toISOString().slice(0, 10);
          days[k] = { date: k, dailyLearning: { hayomYom: { available: true, text: `היום יום ${k}` } } };
        }
        return { ok: true, json: async () => ({ from, days }) };
      }
      const k = u.searchParams.get('date');
      return { ok: true, json: async () => ({ date: k, dailyLearning: { hayomYom: { available: true, text: `היום יום ${k}` } } }) };
    };
    feed = await bundle('client/src/lib/jewish-feed-client.js');
  });

  it('prefetches 30 days ahead in chunks', async () => {
    const stored = await feed.prefetchJewishFeedRange('demo', 'he', '2026-10-31');
    assert.equal(stored, 30);
    assert.ok(fetchLog.filter((u) => u.includes('/range')).length >= 4);
  });

  it('serves the next day from the device cache when offline (no blank)', async () => {
    online = false;
    const next = await feed.fetchJewishFeed('demo', 'he', '2026-11-01');
    assert.match(next.dailyLearning.hayomYom.text, /2026-11-01/);
    const later = await feed.fetchJewishFeed('demo', 'he', '2026-11-25');
    assert.match(later.dailyLearning.hayomYom.text, /2026-11-25/);
    assert.ok(feed.readOfflineJewishFeed('demo', 'he', '2026-11-29'));
  });

  it('still throws (so the panel keeps the last good content) when a day is not cached', async () => {
    await assert.rejects(() => feed.fetchJewishFeed('demo', 'he', '2027-03-01'));
  });

  it('panel no longer blanks on day change and retries with backoff', () => {
    const jsx = read('client/src/components/JewishContentPanels.jsx');
    assert.doesNotMatch(jsx, /setFeed\(null\)/);
    assert.match(jsx, /readOfflineJewishFeed/);
    assert.match(jsx, /backoffDelayMs/);
    assert.match(jsx, /prefetchJewishFeedRange/);
  });

  it('shabbat times fall back to the cached weeks offline', () => {
    const js = read('client/src/lib/shabbat-times.js');
    assert.match(js, /shabbatTimesFromCache/);
    assert.match(js, /prefetchShabbatWeeks/);
  });

  it('server exposes a date-range endpoint', async () => {
    assert.match(read('app.js'), /\/api\/jewish-content\/range/);
    const { getJewishFeedRange } = require('../lib/jewish-feed');
    const seen = [];
    const out = await getJewishFeedRange('he', null, '2026-12-30', 4, { loader: async (l, s, now) => { seen.push(now.toISOString().slice(0, 10)); return { ok: 1 }; } });
    assert.deepEqual(Object.keys(out), ['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
    assert.deepEqual(seen, Object.keys(out));
  });
});

describe('1.31.0 I21/I22: contacts', () => {
  const { addMissingContactsToDirectory } = require('../lib/contact-directory');
  const { parsePersonContactsFromBody, defaultPhonePlatformFor } = require('../lib/person-contact');
  it('adds missing contacts once, dedup by phone/email', () => {
    const dir = [{ id: 'a', name: 'Dan', phone: '+972 50-123-4567', email: '' }];
    const r = addMissingContactsToDirectory(dir, [
      { name: 'Dan again', phone: '0501234567' },
      { name: 'Ruth', email: 'R@X.com' },
      { name: 'Ruth2', email: 'r@x.com' },
      { name: 'No details' },
    ]);
    assert.equal(r.added, 1);
    assert.equal(r.directory.length, 2);
  });
  it('defaults phone contacts to WhatsApp on Hebrew boards', () => {
    assert.equal(defaultPhonePlatformFor('he'), 'whatsapp');
    assert.equal(defaultPhonePlatformFor('ru'), 'max');
    const [c] = parsePersonContactsFromBody({ contacts: [{ name: 'x', phone: '0501234567' }] }, { defaultPhonePlatform: 'whatsapp' });
    assert.equal(c.platform, 'whatsapp');
    const [k] = parsePersonContactsFromBody({ contacts: [{ name: 'x', phone: '0501234567', platform: 'sms' }] }, { defaultPhonePlatform: 'whatsapp' });
    assert.equal(k.platform, 'sms');
  });
});

describe('1.31.0 I23: editable, gender-aware yahrzeit message', () => {
  const tpl = require('../lib/yahrzeit-message-template');
  const { buildTemplatedYahrzeitMessage } = require('../lib/yahrzeit-messages');
  it('adapts Hebrew words to the deceased gender', () => {
    const f = buildTemplatedYahrzeitMessage({ synagogue: {}, person: { name: 'שרה בת רבקה' }, synagogueName: 'X', contact: { name: 'דוד' }, lang: 'he' });
    assert.match(f.message, /יום השנה שלה/);
    assert.match(f.message, /נשמתה/);
    const m = buildTemplatedYahrzeitMessage({ synagogue: {}, person: { name: 'משה בן אברהם' }, synagogueName: 'X', contact: {}, lang: 'he' });
    assert.match(m.message, /יום השנה שלו/);
  });
  it('saves an edit as a gender-neutral template reused for others', () => {
    const f = buildTemplatedYahrzeitMessage({ synagogue: {}, person: { name: 'שרה בת רבקה' }, synagogueName: 'X', contact: { name: 'דוד' }, donationUrl: 'https://d', lang: 'he' });
    const edited = f.message.replace('יהיה לברכה', 'יהיה לברכה תמיד');
    const template = tpl.toTemplate(edited, { lang: 'he', vars: f.vars, gender: f.gender });
    assert.match(template, /\{deceased\}/);
    assert.match(template, /\{שלו\|שלה\}/);
    assert.match(template, /\{salutation\}/);
    const synagogue = { yahrzeitMessageTemplates: { he: { regular: template } } };
    const m = buildTemplatedYahrzeitMessage({ synagogue, person: { name: 'משה בן אברהם' }, synagogueName: 'X', contact: { name: 'רחל' }, donationUrl: 'https://d', lang: 'he' });
    assert.match(m.message, /משה בן אברהם/);
    assert.match(m.message, /שלו\./);
    assert.match(m.message, /שלום רחל/);
    assert.match(m.message, /לברכה תמיד/);
  });
  it('textarea is editable and edits are posted as a template', () => {
    assert.doesNotMatch(read('views/admin/yahrzeit.handlebars'), /yahrzeit-message" rows="8" readonly/);
    assert.match(read('public/js/admin-yahrzeit.js'), /message-template/);
  });
});

describe('1.31.0 I20/I24', () => {
  it('preview popovers cover barcodes, texts and toggles with a hidden-parts list', () => {
    const js = read('public/js/admin-preview-editor.js');
    assert.match(js, /donation-qr-panel/);
    assert.match(js, /donationQrText/);
    assert.match(js, /previewHiddenParts/);
    assert.match(js, /TOGGLE_IDS\(\)\.forEach/);
    assert.doesNotMatch(js, /contenteditable/i);
  });
  it('Hebrew boards lay out Shabbat times and weather RTL', () => {
    assert.match(read('styles/home.scss'), /1\.31\.0 I24[\s\S]*shabbat-times-row[\s\S]*direction: rtl/);
    assert.match(read('client/src/components/ShabbatTimes.jsx'), /dir=\{uiLang === 'he'/);
  });
});
