/**
 * 1.41.0: the two-option segmented toggles (before/after sunset, male/female, Gregorian/Hebrew)
 * must be fully enclosed by their frame, on desktop and on a phone.
 *
 * Two real defects are pinned here:
 * 1. The options are <label> elements inside `.form-field`, and `.form-field label` (display:block,
 *    margin-bottom, text-transform) out-specified `.admin-seg-option`. Each pill became a block with
 *    a stray bottom margin, so the frame no longer surrounded it (same root cause as I50).
 * 2. The pills were sized with content-box `width: 100%`, so the 1px border pushed the selected
 *    pill out of the rounded frame; and `outline-offset: 2px` drew the focus ring outside the frame
 *    while the frame clipped it (`overflow: hidden`) — or, worse, painted it over the border.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const ADMIN_SCSS = read('styles/admin.scss');
const PUBLIC_SCSS = read('styles/public-submission.scss');
const DEATH_FIELDS = read('views/partials/admin-death-date-fields.handlebars');
const PEOPLE = read('views/admin/people.handlebars');
const PUBLIC_BLOCK = read('views/partials/public-add-name-deceased-block.handlebars');

/** Extract a top-level rule body by selector, tolerating whitespace and nested braces. */
function ruleBody(scss, selectorStart) {
  const start = scss.indexOf(selectorStart);
  if (start < 0) return null;
  const open = scss.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < scss.length; i += 1) {
    if (scss[i] === '{') depth += 1;
    else if (scss[i] === '}') {
      depth -= 1;
      if (depth === 0) return scss.slice(open + 1, i);
    }
  }
  return null;
}

describe('1.41.0: segmented toggles are framed correctly (admin)', () => {
  it('the frame is border-box, wraps, and clips its corners', () => {
    const frame = ruleBody(ADMIN_SCSS, '.admin-seg {');
    assert.ok(frame, '.admin-seg rule missing');
    assert.match(frame, /display:\s*inline-flex/);
    assert.match(frame, /flex-wrap:\s*wrap/);
    assert.match(frame, /box-sizing:\s*border-box/);
    assert.match(frame, /max-width:\s*100%/);
    // keeps the selected pill's corners inside the rounded frame in old browsers too
    assert.match(frame, /overflow:\s*hidden/);
  });

  it('the option re-asserts its flex box against `.form-field label`', () => {
    // the winning selector must mention the form-field context or the label element type
    assert.match(ADMIN_SCSS, /\.form-field \.admin-seg-option,/);
    const option = ruleBody(ADMIN_SCSS, '.admin-seg .admin-seg-option,');
    assert.ok(option, '.admin-seg-option override rule missing');
    assert.match(option, /display:\s*inline-flex/);
    assert.match(option, /margin:\s*0/);
    assert.match(option, /text-transform:\s*none/);
    assert.match(option, /box-sizing:\s*border-box/);
  });

  it('the pills are border-box so a full-width pill cannot overflow the frame', () => {
    const pill = ruleBody(ADMIN_SCSS, '.admin-seg-option span {');
    assert.ok(pill, '.admin-seg-option span rule missing');
    assert.match(pill, /box-sizing:\s*border-box/);
    assert.match(pill, /min-height:\s*36px/);
  });

  it('the focus ring is drawn inside the pill, so the frame cannot clip it', () => {
    const focus = ADMIN_SCSS.match(/\.admin-seg-option input:focus-visible \+ span \{([^}]*)\}/);
    assert.ok(focus, 'focus-visible rule missing');
    assert.match(focus[1], /outline:\s*2px solid/);
    // a negative offset keeps the ring within the pill's own box
    assert.match(focus[1], /outline-offset:\s*-\d/);
    assert.doesNotMatch(focus[1], /outline-offset:\s*2px/);
  });

  it('the selected option carries a text cue as well as the colour', () => {
    // underline is used rather than a ✓ glyph, so selecting cannot change the pill's width/height
    const checked = ADMIN_SCSS.match(/\.admin-seg-option input:checked \+ span \{([^}]*)\}/);
    assert.ok(checked, 'checked-option rule missing');
    assert.match(checked[1], /text-decoration:\s*underline/);
    assert.match(checked[1], /text-decoration-thickness/);
    // and nothing reintroduces a width-taking glyph in the shared (unscoped) rule
    assert.doesNotMatch(ADMIN_SCSS, /^(?!\.people-name-order-seg)\.admin-seg-option input:checked \+ span::before/m);
  });

  it('the end options take the frame curve, and a wrapped frame is a rounded rectangle', () => {
    assert.match(ADMIN_SCSS, /\.admin-seg \.admin-seg-option:first-of-type span \{[^}]*border-start-start-radius/);
    assert.match(ADMIN_SCSS, /\.admin-seg \.admin-seg-option:last-of-type span \{[^}]*border-start-end-radius/);
    assert.match(ADMIN_SCSS, /@media \(max-width: 599\.98px\) \{\s*\.admin-seg \{ --admin-seg-radius: var\(--admin-radius\); \}/);
  });

  it('the sunset toggle may still wrap instead of forcing one row', () => {
    const sunset = ADMIN_SCSS.match(/\.admin-sunset-field \.admin-seg \{[^}]*\}/);
    assert.ok(sunset, '.admin-sunset-field .admin-seg rule missing');
    assert.doesNotMatch(sunset[0], /flex-wrap:\s*nowrap/);
  });

  it('the hidden "unknown" gender radio is never a flex item', () => {
    assert.match(ADMIN_SCSS, /\.admin-seg > input\[hidden\],\s*\.admin-seg \.admin-seg-unknown \{ display: none !important; \}/);
    // and the markup still ships that hidden radio for "not set"
    assert.match(PEOPLE, /class="admin-seg-unknown" checked hidden/);
  });

  it('all three admin toggles use the shared classes', () => {
    // death-date mode + sunset
    assert.match(DEATH_FIELDS, /class="admin-death-mode-pills admin-seg"/);
    assert.equal((DEATH_FIELDS.match(/class="admin-seg"/g) || []).length, 1);
    // gender (add + edit)
    assert.equal((PEOPLE.match(/<div class="admin-seg" role="radiogroup"/g) || []).length, 2);
  });
});

describe('1.41.0: the public add-name toggles get the same fix', () => {
  it('the frame is border-box, wraps, and clips its corners', () => {
    const frame = ruleBody(PUBLIC_SCSS, '.public-pill-group {');
    assert.ok(frame, '.public-pill-group rule missing');
    assert.match(frame, /box-sizing:\s*border-box/);
    assert.match(frame, /flex-wrap:\s*wrap/);
    assert.match(frame, /max-width:\s*100%/);
    assert.match(frame, /overflow:\s*hidden/);
  });

  it('the pills are border-box with a minimum height', () => {
    const pill = PUBLIC_SCSS.match(/\.public-pill-option \{[\s\S]*?\n  span \{([\s\S]*?)\n  \}/);
    assert.ok(pill, '.public-pill-option span rule missing');
    assert.match(pill[1], /box-sizing:\s*border-box/);
    assert.match(pill[1], /min-height:/);
  });

  it('the focus ring is drawn inside the pill', () => {
    const focus = PUBLIC_SCSS.match(/input:focus-visible \+ span \{\s*outline: 2px solid var\(--accent-color, #ffd54f\);\s*outline-offset: (-\d+)px/);
    assert.ok(focus, 'public focus-visible rule with a negative outline-offset missing');
  });

  it('the selected option carries a text cue as well as the colour', () => {
    // underline instead of a ✓ glyph: no width change when the selection moves
    assert.match(PUBLIC_SCSS, /input:checked \+ span \{\s*font-weight: 800;\s*text-decoration: underline;/);
    assert.doesNotMatch(PUBLIC_SCSS, /input:checked \+ span::before/);
  });

  it('a full-width pair stays on one row (the gap is subtracted from the basis)', () => {
    const gender = PUBLIC_SCSS.match(/\.public-gender-pills \{[\s\S]*?\n\}/);
    assert.ok(gender, '.public-gender-pills rule missing');
    assert.match(gender[0], /flex-wrap:\s*wrap/);
    assert.doesNotMatch(gender[0], /flex-wrap:\s*nowrap/);
    assert.match(gender[0], /flex-basis:\s*calc\(50% - 0\.175rem\)/);
    assert.match(gender[0], /max-width:\s*50%/);
  });

  it('the three public toggles share the pill group', () => {
    assert.equal((PUBLIC_BLOCK.match(/class="public-pill-group public-gender-pills/g) || []).length, 3);
    assert.match(PUBLIC_BLOCK, /public-gender-pills public-sunset-pills/);
  });
});
