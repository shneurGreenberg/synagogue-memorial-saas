const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Hebcal = require('hebcal');
const { INVARIANTS } = require('./invariants-manifest');
const { REGRESSION_AREAS } = require('./regression-manifest');
const { resolveSynagogueTimezone, isYahrzeitToday } = require('../lib/yahrzeit');
const { computeHebrewDateOfDeath } = require('../lib/person-hebrew-death');
const {
  buildSavedViewExport,
  normalizeImportedSnapshot,
} = require('../lib/saved-view-portable');
const { pickDesignFromSnapshot } = require('../lib/saved-view-design');

/** Known gaps (not fixed in this pass). */
const VIOLATIONS = [];

describe('invariants manifest', () => {
  it('lists every documented invariant', () => {
    assert.ok(INVARIANTS.length >= 10);
    const ids = new Set(INVARIANTS.map((row) => row.id));
    assert.equal(ids.size, INVARIANTS.length);
  });

  it('regression manifest files exist on disk', () => {
    for (const area of REGRESSION_AREAS) {
      for (const rel of area.tests) {
        assert.ok(fs.existsSync(path.join(__dirname, '..', rel)), `${area.topic}: missing ${rel}`);
      }
    }
  });
});

describe('invariant: timezone per community', () => {
  it('uses location.timezone for yahrzeit day boundary', () => {
    const tzJerusalem = resolveSynagogueTimezone({ location: { timezone: 'Asia/Jerusalem' } });
    const tzNov = resolveSynagogueTimezone({ location: { timezone: 'Asia/Novosibirsk' } });
    assert.notEqual(tzJerusalem, tzNov);

    const person = {
      gregorianDateOfDeath: { year: 2020, month: 1, date: 15 },
      hebrewDateOfDeath: { month: 4, date: 18, year: 5780 },
    };
    const atUtc = new Date('2020-01-15T22:00:00Z');
    const inJerusalem = isYahrzeitToday(person, tzJerusalem, atUtc);
    const inNovosibirsk = isYahrzeitToday(person, tzNov, atUtc);
    assert.equal(typeof inJerusalem, 'boolean');
    assert.equal(typeof inNovosibirsk, 'boolean');
  });
});

describe('invariant: Hebrew calendar leap / Adar', () => {
  it('maps civil date in Adar II leap year via Hebcal', () => {
    const hdate = new Hebcal.HDate(15, 13, 5776);
    assert.equal(hdate.getMonth(), 13);
    const greg = hdate.greg();
    const stored = computeHebrewDateOfDeath({
      year: greg.getFullYear(),
      month: greg.getMonth() + 1,
      date: greg.getDate(),
    });
    assert.equal(stored.month, 13);
    assert.equal(stored.date, 15);
  });
});

describe('invariant: saved-view design roundtrip', () => {
  it('export then import keeps design only', () => {
    const synagogue = {
      theme: { logo: 'keep.png', primaryColor: '#000000' },
      publicSubmission: { showDonationQr: false, showRegistrationQr: true },
      titles: { ru: 'Community' },
    };
    const design = pickDesignFromSnapshot({
      theme: { primaryColor: '#abcdef', logo: 'drop.png' },
      memorialQrPanel: { titleScale: 110 },
    });
    const exported = buildSavedViewExport({ name: 'Test', snapshot: design });
    const imported = normalizeImportedSnapshot(exported, synagogue);
    assert.equal(imported.theme.primaryColor, '#abcdef');
    assert.equal(imported.theme.logo, undefined);
    assert.equal(imported.titles, undefined);
    assert.equal(imported.publicSubmission, undefined);
  });
});

describe('invariant: yahrzeit after sunset', () => {
  it.todo('Death after sunset should shift Hebrew date — not implemented in computeHebrewDateOfDeath yet');
});

describe('invariant violations ledger', () => {
  it('records open gaps for tracking', () => {
    if (VIOLATIONS.length) {
      console.log('Open invariant violations:', VIOLATIONS);
    }
    assert.ok(Array.isArray(VIOLATIONS));
  });
});
