const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeSlideshowSchedule,
  normalizeTime,
  normalizeDate,
  isSlideshowActiveAt,
  applyScheduleToSlideshow,
  hasSchedule,
  describeSlideshowSchedule,
} = require('../lib/slideshow-schedule');
const {
  parseSlideshowScheduleFromBody,
  hasSlideshowSchedulePayload,
} = require('../lib/slideshow-admin-settings');

const TZ = 'Asia/Jerusalem';

function at(iso) {
  return new Date(iso);
}

describe('1.34.0 I52 slideshow schedule: input normalization', () => {
  it('accepts real times/dates and rejects junk', () => {
    assert.equal(normalizeTime('7:05'), '07:05');
    assert.equal(normalizeTime('23:59'), '23:59');
    assert.equal(normalizeTime('24:00'), '');
    assert.equal(normalizeTime('10:70'), '');
    assert.equal(normalizeTime('hello'), '');
    assert.equal(normalizeDate('2026-11-08'), '2026-11-08');
    assert.equal(normalizeDate('2026-02-30'), '');
    assert.equal(normalizeDate('08/11/2026'), '');
  });

  it('drops bad days, duplicate days and zero-length windows', () => {
    const out = normalizeSlideshowSchedule({
      days: [
        { day: 0, start: '01:00', end: '02:00' },
        { day: 0, start: '05:00', end: '06:00' },
        { day: 9, start: '01:00', end: '02:00' },
        { day: 1, start: 'bad', end: '02:00' },
        { day: 2, start: '10:00', end: '10:00' },
      ],
    });
    assert.deepEqual(out.days, [{ day: 0, start: '01:00', end: '02:00' }]);
  });

  it('drops an inverted date range but keeps the start', () => {
    const out = normalizeSlideshowSchedule({ from: '2026-11-10', to: '2026-11-01' });
    assert.equal(out.from, '2026-11-10');
    assert.equal(out.to, '');
  });

  it('an empty schedule means always', () => {
    assert.equal(hasSchedule({}), false);
    assert.equal(isSlideshowActiveAt({}, at('2026-11-08T10:00:00Z'), TZ).active, true);
  });
});

describe('1.34.0 I52 slideshow schedule: window math', () => {
  // 2026-11-08 is a Sunday; Israel is UTC+2 in November.
  const sundayEarly = { days: [{ day: 0, start: '01:00', end: '02:00' }] };

  it('is active inside a same-day window only', () => {
    assert.equal(isSlideshowActiveAt(sundayEarly, at('2026-11-07T23:30:00Z'), TZ).active, true);   // Sun 01:30
    assert.equal(isSlideshowActiveAt(sundayEarly, at('2026-11-08T00:30:00Z'), TZ).active, false); // Sun 02:30
    assert.equal(isSlideshowActiveAt(sundayEarly, at('2026-11-07T23:59:00Z'), TZ).active, true);   // Sun 01:59
    assert.equal(isSlideshowActiveAt(sundayEarly, at('2026-11-08T00:00:00Z'), TZ).active, false);  // Sun 02:00 sharp
    assert.equal(isSlideshowActiveAt(sundayEarly, at('2026-11-08T10:00:00Z'), TZ).active, false); // Sun 12:00
    assert.equal(isSlideshowActiveAt(sundayEarly, at('2026-11-06T23:30:00Z'), TZ).active, false); // Fri 01:30
  });

  it('handles a window that crosses midnight', () => {
    const cross = { days: [{ day: 0, start: '23:00', end: '01:00' }] };
    // Sunday 23:30 local (Sun 21:30Z)
    assert.equal(isSlideshowActiveAt(cross, at('2026-11-08T21:30:00Z'), TZ).active, true);
    // Monday 00:30 local - the tail belongs to Sunday's window
    assert.equal(isSlideshowActiveAt(cross, at('2026-11-08T22:30:00Z'), TZ).active, true);
    // Tuesday 00:30 local - no window opened on Monday
    assert.equal(isSlideshowActiveAt(cross, at('2026-11-09T22:30:00Z'), TZ).active, false);
    // Sunday 22:00 local - before the window opens
    assert.equal(isSlideshowActiveAt(cross, at('2026-11-08T20:00:00Z'), TZ).active, false);
  });

  it('respects the date range', () => {
    const sched = { from: '2026-11-08', to: '2026-11-10' };
    assert.equal(isSlideshowActiveAt(sched, at('2026-11-07T10:00:00Z'), TZ).active, false);
    assert.equal(isSlideshowActiveAt(sched, at('2026-11-09T10:00:00Z'), TZ).active, true);
    assert.equal(isSlideshowActiveAt(sched, at('2026-11-11T10:00:00Z'), TZ).active, false);
  });

  it('uses the community timezone, not the server timezone', () => {
    const sched = { days: [{ day: 0, start: '01:00', end: '02:00' }] };
    // 2026-11-08T23:30Z is Sunday 01:30 in Jerusalem but already Monday 06:30 in Tokyo.
    assert.equal(isSlideshowActiveAt(sched, at('2026-11-07T23:30:00Z'), 'Asia/Jerusalem').active, true);
    assert.equal(isSlideshowActiveAt(sched, at('2026-11-07T23:30:00Z'), 'Asia/Tokyo').active, false);
  });
});

describe('1.34.0 I52 slideshow schedule: board behaviour', () => {
  const enabled = { enabled: true, displayMode: 'rotate', images: [{ url: 'a.jpg' }] };
  const sched = { days: [{ day: 0, start: '01:00', end: '02:00' }] };

  it('outside the window the slideshow reports itself off (normal display)', () => {
    const out = applyScheduleToSlideshow({ ...enabled, schedule: sched }, at('2026-11-08T10:00:00Z'), TZ);
    assert.equal(out.enabled, false);
    assert.equal(out.scheduleActive, false);
  });

  it('inside the window it stays on', () => {
    const out = applyScheduleToSlideshow({ ...enabled, schedule: sched }, at('2026-11-07T23:30:00Z'), TZ);
    assert.equal(out.enabled, true);
    assert.equal(out.scheduleActive, true);
  });

  it('no schedule at all keeps the old behaviour', () => {
    const out = applyScheduleToSlideshow(enabled, at('2026-11-08T10:00:00Z'), TZ);
    assert.equal(out.enabled, true);
  });

  it('a slideshow the owner switched off stays off even inside the window', () => {
    const out = applyScheduleToSlideshow(
      { ...enabled, enabled: false, schedule: sched },
      at('2026-11-07T23:30:00Z'),
      TZ,
    );
    assert.equal(out.enabled, false);
  });
});

describe('1.34.0 I52 slideshow schedule: admin form parsing', () => {
  it('reads the per-day fields', () => {
    const parsed = parseSlideshowScheduleFromBody({
      scheduleFrom: '2026-11-01',
      scheduleTo: '2026-12-01',
      scheduleDay_0: '1',
      scheduleStart_0: '01:00',
      scheduleEnd_0: '02:00',
      scheduleDay_3: 'on',
      scheduleStart_3: '23:00',
      scheduleEnd_3: '01:00',
    });
    assert.equal(parsed.from, '2026-11-01');
    assert.equal(parsed.to, '2026-12-01');
    assert.deepEqual(parsed.days, [
      { day: 0, start: '01:00', end: '02:00' },
      { day: 3, start: '23:00', end: '01:00' },
    ]);
  });

  it('ignores bad times and unticked days', () => {
    const parsed = parseSlideshowScheduleFromBody({
      scheduleDay_1: '1',
      scheduleStart_1: 'not a time',
      scheduleEnd_1: '02:00',
      scheduleDay_2: '0',
      scheduleStart_2: '10:00',
      scheduleEnd_2: '11:00',
    });
    assert.deepEqual(parsed.days, []);
  });

  it('detects whether the form posted any schedule field at all', () => {
    assert.equal(hasSlideshowSchedulePayload({}), false);
    assert.equal(hasSlideshowSchedulePayload({ scheduleFrom: '' }), true);
    assert.equal(hasSlideshowSchedulePayload({ scheduleDay_4: '0' }), true);
  });
});

describe('1.34.0 I52 schedule summary', () => {
  it('describes the window in Hebrew words', () => {
    const out = describeSlideshowSchedule({ days: [{ day: 0, start: '01:00', end: '02:00' }] });
    assert.deepEqual(out.windows, ['ראשון 01:00–02:00']);
    assert.equal(out.range, '');
  });
});
