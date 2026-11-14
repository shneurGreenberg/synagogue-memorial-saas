const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('1.35.0 I54: single day-boundary timer (no per-minute poll)', () => {
  it('board-calendar schedules one boundary timer and wake listeners, not setInterval(60000)', () => {
    const src = read('client/src/lib/board-calendar.js');
    assert.match(src, /msUntilNextDayBoundary/);
    assert.match(src, /visibilitychange/);
    assert.match(src, /pageshow/);
    assert.doesNotMatch(src, /setInterval\(check,\s*60000\)/);
    assert.doesNotMatch(src, /minuteTimer/);
  });

  it('HomePage no longer polls computeDayKey every 60s', () => {
    const src = read('client/src/pages/HomePage.jsx');
    assert.match(src, /subscribeToCalendarDayChange/);
    assert.doesNotMatch(src, /setInterval\(\(\) => \{\s*const key = computeDayKey/);
    assert.doesNotMatch(src, /60 \* 1000/);
  });

  it('BoardDataContext 8s content-version poll is unchanged', () => {
    const src = read('client/src/context/BoardDataContext.jsx');
    assert.match(src, /const POLL_MS = 8000/);
  });
});

describe('1.35.0 I58: Hebrew day boundary at sunset', () => {
  it('shared helper advances Hebrew date after sunset and keeps midnight for gregorian', () => {
    const {
      getHebrewDateInTimezone,
      getCalendarDayKey,
      msUntilNextDayBoundary,
      sunsetForCivilDay,
    } = require('../lib/hebrew-day-boundary');

    const tz = 'Asia/Novosibirsk';
    const lat = 54.9833;
    const lng = 82.8964;
    // Noon — before sunset
    const noon = new Date('2026-11-05T05:00:00.000Z'); // ~12:00 in Novosibirsk (UTC+7)
    const before = getHebrewDateInTimezone(tz, noon, { calendar: 'hebrew', lat, lng });
    const sunset = sunsetForCivilDay(tz, lat, lng, noon);
    assert.ok(sunset instanceof Date);
    const after = getHebrewDateInTimezone(tz, new Date(sunset.getTime() + 60 * 1000), {
      calendar: 'hebrew', lat, lng,
    });
    assert.equal(after.abs() - before.abs(), 1);

    const gregKey1 = getCalendarDayKey(tz, noon, { calendar: 'gregorian' });
    const gregKey2 = getCalendarDayKey(tz, new Date(sunset.getTime() + 60 * 1000), { calendar: 'gregorian' });
    assert.equal(gregKey1, gregKey2);

    const heKey1 = getCalendarDayKey(tz, noon, { calendar: 'hebrew', lat, lng });
    const heKey2 = getCalendarDayKey(tz, new Date(sunset.getTime() + 60 * 1000), { calendar: 'hebrew', lat, lng });
    assert.notEqual(heKey1, heKey2);

    const ms = msUntilNextDayBoundary(tz, noon, { calendar: 'hebrew', lat, lng });
    assert.ok(ms > 0);
    assert.ok(ms < 24 * 3600 * 1000);
  });
});

describe('1.35.0 I55: boardCalendar visible on mobile / middle preview', () => {
  it('dashboard surfaces boardCalendar outside the collapsed features panel', () => {
    const dash = read('views/admin/dashboard.handlebars');
    assert.match(dash, /board-calendar-visible-panel/);
    assert.match(dash, /id="boardCalendar"/);
    // Only one select with that id
    assert.equal((dash.match(/id="boardCalendar"/g) || []).length, 1);
  });

  it('preview editor exposes boardCalendar on the middle region', () => {
    const ed = read('public/js/admin-preview-editor.js');
    assert.match(ed, /key: 'middle'[\s\S]*boardCalendar/);
  });
});

describe('1.35.0 I56: community message newlines', () => {
  it('sanitizeRichText turns plain newlines into <br/>', () => {
    // Load via a tiny vm-less path: duplicate the export by requiring through a CJS bridge is hard for ESM.
    // Assert the source and CSS contract instead, plus a direct regex check matching the implementation.
    const src = read('client/src/lib/html-sanitize.js');
    assert.match(src, /replace\(\/\\r\\n\|\\r\|\\n\/g,\s*'<br\/>'\)/);
    assert.match(read('styles/home.scss'), /synagogue-info-announcement[\s\S]*white-space:\s*pre-line/);
  });
});

describe('1.35.0 I57: luach.day Hayom Yom Hebrew', () => {
  it('builds correct month/day URLs including adar-ii and nissan', () => {
    const { luachDayUrl, monthSlugForHebcal, parseLuachDayHayomYomHtml } = require('../lib/luach-day-hayom-yom');
    assert.equal(monthSlugForHebcal(8), 'cheshvan');
    assert.equal(monthSlugForHebcal(1), 'nissan');
    assert.equal(monthSlugForHebcal(13), 'adar-ii');
    assert.equal(luachDayUrl(8, 25), 'https://luach.day/hayom-yom/cheshvan-25/');
    assert.equal(luachDayUrl(13, 1), 'https://luach.day/hayom-yom/adar-ii-1/');

    const sample = `<script type="application/ld+json">{"articleBody":"שורה ראשונה.\\nשורה שנייה."}</script>
<p class="hy-text">fallback</p>`;
    assert.equal(parseLuachDayHayomYomHtml(sample), 'שורה ראשונה.\nשורה שנייה.');
  });

  it('store and feed accept luach.day as a trusted Hebrew source', () => {
    assert.match(read('lib/hayom-yom-store.js'), /LUACH_SOURCE/);
    assert.match(read('lib/hayom-yom-store.js'), /fetchLuachDayHayomYom/);
    assert.match(read('lib/jewish-feed.js'), /luach\.day/);
  });
});

describe('1.35.0 I59: separate zmanim / prayers scales', () => {
  it('defaults both new scales to the legacy combinedInfoScale', () => {
    const { resolveCombinedInfoScales } = require('../lib/combined-info-scales');
    assert.deepEqual(resolveCombinedInfoScales({ combinedInfoScale: 140 }), {
      combinedInfoScale: 140,
      combinedZmanimScale: 140,
      combinedPrayersScale: 140,
      combinedAnnouncementScale: 100,
    });
    assert.equal(resolveCombinedInfoScales({
      combinedInfoScale: 100,
      combinedZmanimScale: 120,
      combinedPrayersScale: 80,
    }).combinedZmanimScale, 120);
  });

  it('admin UI and board panel wire the two scales', () => {
    assert.match(read('views/admin/dashboard.handlebars'), /combinedZmanimScale/);
    assert.match(read('views/admin/dashboard.handlebars'), /combinedPrayersScale/);
    assert.match(read('client/src/components/SynagogueInfoPanel.jsx'), /combinedZmanimScale/);
    assert.match(read('client/src/components/SynagogueInfoPanel.jsx'), /combinedPrayersScale/);
  });
});

describe('1.35.0 I60: one barcode heading', () => {
  it('panels render only the heading and promote subtitle when title empty', () => {
    const { normalizeMemorialQrPanel } = require('../lib/memorial-qr-panel');
    const migrated = normalizeMemorialQrPanel({
      titleText: '',
      textText: 'Only subtitle',
      donationTitleText: '',
      donationTextText: 'Donate subtitle',
    });
    assert.equal(migrated.titleText, 'Only subtitle');
    assert.equal(migrated.textText, '');
    assert.equal(migrated.donationTitleText, 'Donate subtitle');
    assert.equal(migrated.donationTextText, '');

    assert.doesNotMatch(read('client/src/components/DonationQrPanel.jsx'), /memorial-submission-text/);
    assert.doesNotMatch(read('client/src/components/MemorialSubmissionPanel.jsx'), /memorial-submission-text/);
    assert.doesNotMatch(read('views/partials/admin-settings-community-texts.handlebars'), /donationQrText/);
    assert.doesNotMatch(read('views/partials/admin-settings-community-texts.handlebars'), /memorialQrText"/);
  });
});

describe('1.35.0 version', () => {
  it('changelog leads with the current release', () => {
    const raw = JSON.parse(read('CHANGELOG.json'));
    assert.equal(raw[0].version, '1.38.0');
    delete require.cache[require.resolve('../lib/changelog')];
    // Force reload by clearing the module's internal cache via re-require after file read path
    const changelogPath = require.resolve('../lib/changelog');
    delete require.cache[changelogPath];
    const mod = require('../lib/changelog');
    // loadChangelog caches in module scope; re-require is enough after delete
    assert.equal(mod.currentCodeVersion(), '1.38.0');
  });
});
