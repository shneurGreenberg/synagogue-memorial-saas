const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('1.34.0 I46: classes get their own heading', () => {
  it('the board panel renders a classes heading above the first class row', () => {
    const panel = read('client/src/components/SynagogueInfoPanel.jsx');
    assert.match(panel, /synagogue-info-group-title/);
    assert.match(panel, /heading\('classes', 'classes_title'\)/);
    // Hidden entirely when there are no class rows.
    assert.match(panel, /classRows\.length > 0/);
  });

  it('the schema, the settings saver and the preview all know the classes heading', () => {
    assert.match(read('models/Synagogue.js'), /classes: \{ type: String, default: '' \}/);
    const { SECTION_TITLE_KEYS, defaultSectionTitles, normalizeSectionTitles } = require('../lib/board-mode');
    assert.ok(SECTION_TITLE_KEYS.includes('classes'));
    assert.equal(defaultSectionTitles('he').classes, 'שיעורים');
    assert.equal(defaultSectionTitles('en').classes, 'Classes');
    assert.equal(defaultSectionTitles('ru').classes, 'Уроки');
    assert.equal(normalizeSectionTitles({ classes: ' שיעורי תורה ' }).classes, 'שיעורי תורה');
  });

  it('has default board i18n strings in all three languages', () => {
    ['he', 'en', 'ru'].forEach((lang) => {
      assert.match(read(`client/src/lib/i18n-resources/${lang}.js`), /classes_title:/, lang);
    });
  });
});

describe('1.34.0 I51: community messages have no heading', () => {
  it('the board does not render an announcements heading', () => {
    const panel = read('client/src/components/SynagogueInfoPanel.jsx');
    assert.doesNotMatch(panel, /heading\('announcements'/);
    assert.doesNotMatch(panel, /announcements_title/);
    assert.match(panel, /synagogue-info-announcements--untitled/);
  });

  it('the admin cannot edit a heading that never shows', () => {
    assert.doesNotMatch(read('views/admin/dashboard.handlebars'), /sectionTitle_announcements/);
    assert.doesNotMatch(read('public/js/admin-preview-editor.js'), /sectionTitle_announcements/);
    assert.ok(!require('../lib/board-mode').SECTION_TITLE_KEYS.includes('announcements'));
  });
});

describe('1.34.0 I47: one always-visible save button on phones', () => {
  const script = read('public/js/admin-mobile-save.js');

  it('a dedicated sticky bar is wired into the admin layout', () => {
    assert.match(read('views/layouts/admin.handlebars'), /admin-mobile-save\.js/);
    assert.match(script, /admin-mobile-savebar/);
    assert.match(script, /data-mobile-save/);
  });

  it('every settings form that saves opts in', () => {
    const dashboard = read('views/admin/dashboard.handlebars');
    const events = read('views/admin/events.handlebars');
    const yahrzeit = read('views/admin/yahrzeit.handlebars');
    assert.match(dashboard, /id="settingsForm"[^>]*data-mobile-save="1"/);
    assert.match(events, /id="prayerTimesForm"[^>]*data-mobile-save="1"/);
    assert.match(events, /id="slideshowPanelForm"[^>]*data-mobile-save="1"/);
    assert.match(events, /id="addEventForm"[^>]*data-mobile-save="1"/);
    assert.match(yahrzeit, /yahrzeit-push-form"[^>]*data-mobile-save="1"/);
  });

  it('the bar is fixed above the tile nav, safe-area aware, and small saves hide on phones', () => {
    const css = read('styles/admin.scss');
    assert.match(css, /\.admin-mobile-savebar \{[\s\S]{0,400}position: fixed/);
    assert.match(css, /env\(safe-area-inset-bottom/);
    assert.match(css, /body\.has-mobile-savebar \.admin-container \{ padding-bottom/);
  });

  it('it submits the form of the visible tab, never a modal', () => {
    assert.match(script, /closest\('\.modal'\)/);
    assert.match(script, /requestSubmit/);
  });
});

describe('1.34.0 I48: one radii family everywhere', () => {
  const css = read('styles/admin.scss');

  it('admin.css uses the radius variables instead of one-off values', () => {
    const literals = [...css.matchAll(/border-radius:\s*(\d+)px/g)].map((m) => Number(m[1]));
    // 999px pills are legitimate; anything else must come from --admin-radius(-sm).
    assert.deepEqual(literals.filter((n) => n !== 999), []);
  });

  it('defines the radius variables on the dark theme too (was light-only)', () => {
    // The dark palette block is the one holding the dark background color.
    const start = css.indexOf('--admin-bg: #0c0e14;');
    assert.ok(start > 0);
    const darkBlock = css.slice(start, css.indexOf('}', start));
    assert.match(darkBlock, /--admin-radius: 12px/);
    assert.match(darkBlock, /--admin-radius-sm: 8px/);
  });

  it('colour swatches use the same radii family', () => {
    assert.match(read('styles/_logo-bg-swatches.scss'), /border-radius: var\(--admin-radius-sm/);
  });
});

describe('1.34.0 I49/I50: the permanent switch is unambiguous and correctly sized', () => {
  const people = read('views/admin/people.handlebars');

  it('both forms use the shared toggle-switch with a spelled-out state', () => {
    assert.match(people, /class="admin-permanent-toggle toggle-switch"/);
    assert.match(people, /data-permanent-switch/);
    assert.match(people, /data-permanent-state/);
    assert.match(people, /permanent_on/);
    assert.match(people, /permanent_off/);
    // no coloured chip with the ambiguous old look
    assert.doesNotMatch(people, /<label class="admin-permanent-toggle">\s*<input[^>]*>\s*<span>\{\{t 'permanent_label'\}\}<\/span>/);
  });

  it('the track is the standard 52x28 with no extra frame', () => {
    const css = read('styles/admin.scss');
    // The track is sized explicitly so the frame can never grow past the switch itself.
    assert.match(css, /\.admin-permanent-field \.admin-permanent-toggle \.toggle-slider \{[^}]*width: 52px;[^}]*height: 28px;/);
    assert.match(css, /\.admin-permanent-field \{ display: flex; flex-direction: column; gap: 6px; \}/);
  });

  it('the state text follows the switch when the edit modal fills in', () => {
    assert.match(read('public/js/admin-people.js'), /syncPermanentState/);
  });
});

describe('1.34.0 I52: slideshow scheduling', () => {
  it('the schema stores a schedule with a range and day windows', () => {
    const model = read('models/Synagogue.js');
    assert.match(model, /schedule: \{/);
    assert.match(model, /from: \{ type: String, default: '' \}/);
    assert.match(model, /day: \{ type: Number, default: 0, min: 0, max: 6 \}/);
  });

  it('the board payload is decided on the server', () => {
    const loader = read('lib/load-synagogue-board.js');
    assert.match(loader, /applySlideshowScheduleForBoard/);
    assert.match(loader, /resolveSynagogueTimezone/);
  });

  it('the admin tab has a Hebrew scheduler with a summary', () => {
    const events = read('views/admin/events.handlebars');
    assert.match(events, /id="slideshowSchedule"/);
    assert.match(events, /name="scheduleFrom"/);
    assert.match(events, /name="scheduleDay_\{\{this\.day\}\}"/);
    assert.match(events, /id="slideshowScheduleSummary"/);
  });

  it('the settings route saves the schedule', () => {
    assert.match(read('routes/admin.js'), /'slideshow\.schedule\.days'/);
  });
});

describe('1.34.0 I53: phone push for upcoming yahrzeits', () => {
  it('web-push is a dependency and keys come only from the environment', () => {
    const pkg = JSON.parse(read('package.json'));
    assert.ok(pkg.dependencies['web-push']);
    const lib = read('lib/web-push.js');
    assert.match(lib, /process\.env\.WEB_PUSH_PUBLIC_KEY/);
    assert.match(lib, /process\.env\.WEB_PUSH_PRIVATE_KEY/);
    // never a hardcoded VAPID key
    assert.doesNotMatch(lib, /B[A-Za-z0-9_-]{80,}/);
  });

  it('the community stores subscriptions and a yahrzeitPush setting', () => {
    const model = read('models/Synagogue.js');
    assert.match(model, /pushSubscriptions/);
    assert.match(model, /p256dh/);
    assert.match(model, /yahrzeitPush: \{/);
    assert.match(model, /daysBefore: \{ type: Number, default: 3/);
  });

  it('the service worker handles push and notification clicks and bumped its version', () => {
    const pwa = read('lib/admin-pwa.js');
    assert.match(pwa, /admin-sw-v3/);
    assert.match(pwa, /addEventListener\('push'/);
    assert.match(pwa, /addEventListener\('notificationclick'/);
  });

  it('the admin has explicit subscribe/unsubscribe routes and a click-only script', () => {
    const routes = read('routes/admin.js');
    assert.match(routes, /\/:slug\/push\/subscribe/);
    assert.match(routes, /\/:slug\/push\/unsubscribe/);
    const script = read('public/js/admin-push.js');
    assert.match(script, /Notification\.requestPermission/);
    // permission is only requested inside the click handler, never on load
    const loadPart = script.slice(0, script.indexOf('async function subscribe'));
    assert.doesNotMatch(loadPart, /requestPermission\(/);
  });

  it('the email reminder is untouched and still works alongside', () => {
    const reminders = read('lib/yahrzeit-reminders.js');
    assert.match(reminders, /sendDailyYahrzeitReminders/);
    assert.match(reminders, /lastNotifiedDate/);
  });
});

describe('1.34.0 release bookkeeping', () => {
  it('the changelog has a 1.34.0 entry with all eight notes', () => {
    const raw = JSON.parse(read('CHANGELOG.json'));
    const entry = raw.find((e) => e.version === '1.34.0');
    assert.ok(entry, 'missing 1.34.0');
    assert.ok(raw[0].version === '1.38.0', 'newest first is current release');
    assert.ok(raw.find((e) => e.version === '1.34.0'));
    assert.ok(entry.items.length >= 8, `only ${entry.items.length} items`);
  });
});
