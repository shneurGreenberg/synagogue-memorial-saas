const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeYahrzeitPush,
  parseYahrzeitPushFromBody,
  findUpcomingYahrzeits,
  buildYahrzeitPushPayload,
  sendDailyYahrzeitPush,
} = require('../lib/yahrzeit-push');
const { upsertPushSubscription } = require('../lib/web-push');
const { isSchedulerDisabled, startPushScheduler, runDailyChecks } = require('../lib/push-scheduler');

// Gregorian board: yahrzeit = same month/day each year (see lib/yahrzeit.resolveYahrzeitOptions).
const TZ = 'Asia/Jerusalem';

function community(overrides = {}) {
  return {
    slug: 'tomsk',
    language: 'he',
    location: { timezone: TZ },
    boardCalendar: 'gregorian',
    dateDisplay: 'both',
    people: [
      { id: 1, name: 'אברהם כהן', gregorianDateOfDeath: { date: 10, month: 11, year: 1990 } },
      { id: 2, name: 'שרה לוי', gregorianDateOfDeath: { date: 20, month: 11, year: 1995 } },
    ],
    yahrzeitPush: { enabled: true, daysBefore: 3, lastNotifiedDate: '' },
    pushSubscriptions: [],
    ...overrides,
  };
}

describe('1.34.0 I53 push settings', () => {
  it('defaults to off with a 3-day lead time', () => {
    assert.deepEqual(normalizeYahrzeitPush(), { enabled: false, daysBefore: 3, lastNotifiedDate: '' });
  });

  it('clamps the lead time', () => {
    assert.equal(normalizeYahrzeitPush({ daysBefore: 999 }).daysBefore, 60);
    assert.equal(normalizeYahrzeitPush({ daysBefore: -5 }).daysBefore, 0);
    assert.equal(normalizeYahrzeitPush({ daysBefore: 'abc' }).daysBefore, 3);
  });

  it('parses the form body', () => {
    assert.deepEqual(
      parseYahrzeitPushFromBody({ yahrzeitPushEnabled: '1', yahrzeitPushDaysBefore: '5' }),
      { enabled: true, daysBefore: 5, lastNotifiedDate: '' },
    );
    assert.equal(parseYahrzeitPushFromBody({ yahrzeitPushEnabled: '0' }).enabled, false);
  });
});

describe('1.34.0 I53 upcoming yahrzeits', () => {
  it('finds yahrzeits inside the lead window, today included', () => {
    const now = new Date('2026-11-08T09:00:00Z'); // 11:00 in Jerusalem
    const found = findUpcomingYahrzeits(community(), now, 3);
    assert.deepEqual(found.map((e) => [e.person.id, e.daysAway]), [[1, 2]]);
    assert.equal(found[0].date.getDate(), 10);
  });

  it('finds nothing when the lead window is short', () => {
    const now = new Date('2026-11-08T09:00:00Z');
    assert.equal(findUpcomingYahrzeits(community(), now, 1).length, 0);
  });

  it('includes a yahrzeit that is today', () => {
    const now = new Date('2026-11-10T09:00:00Z');
    const found = findUpcomingYahrzeits(community(), now, 0);
    assert.equal(found.length, 1);
    assert.equal(found[0].daysAway, 0);
  });

  it('builds a Hebrew payload with the name and the date', () => {
    const now = new Date('2026-11-10T09:00:00Z');
    const entries = findUpcomingYahrzeits(community(), now, 0);
    const payload = buildYahrzeitPushPayload(entries, { today: true });
    assert.match(payload.title, /יארצייט היום/);
    assert.match(payload.title, /אברהם כהן/);
    assert.match(payload.body, /10\/11\/2026/);
    assert.equal(payload.url, '/admin/');
  });
});

describe('1.34.0 I53 daily push run', () => {
  function makeModel(docs, updates) {
    return {
      find() {
        return {
          lean: async () => docs.filter((d) => d.yahrzeitPush && d.yahrzeitPush.enabled === true),
        };
      },
      async updateOne(filter, update) {
        updates.push({ slug: filter.slug, set: update.$set });
        return { ok: 1 };
      },
    };
  }

  function fakeClient() {
    const sent = [];
    return { sent, async sendNotification(sub, body) { sent.push({ sub, body }); return {}; } };
  }

  it('sends once and records the day, then never again on the same day', async () => {
    const subs = upsertPushSubscription(upsertPushSubscription([], {
      endpoint: 'https://push.example.com/a', keys: { p256dh: 'k', auth: 'a' },
    }), { endpoint: 'https://push.example.com/b', keys: { p256dh: 'k2', auth: 'a2' } });
    const doc = community({ pushSubscriptions: subs });
    const updates = [];
    const client = fakeClient();
    const now = new Date('2026-11-08T09:00:00Z');

    const first = await sendDailyYahrzeitPush({ now, Synagogue: makeModel([doc], updates), clientOverride: client });
    assert.equal(first.sent, 2);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].set['yahrzeitPush.lastNotifiedDate'], '2026-11-08');

    // Same day again: the guard (lastNotifiedDate) blocks a second send.
    doc.yahrzeitPush.lastNotifiedDate = updates[0].set['yahrzeitPush.lastNotifiedDate'];
    const second = await sendDailyYahrzeitPush({ now, Synagogue: makeModel([doc], updates), clientOverride: client });
    assert.equal(second.sent, 0);
    assert.equal(client.sent.length, 2);
  });

  it('records the day even when there is nothing to announce, so it scans once', async () => {
    const subs = upsertPushSubscription([], {
      endpoint: 'https://push.example.com/a', keys: { p256dh: 'k', auth: 'a' },
    });
    const doc = community({ pushSubscriptions: subs, yahrzeitPush: { enabled: true, daysBefore: 0, lastNotifiedDate: '' } });
    const updates = [];
    const now = new Date('2026-01-05T09:00:00Z'); // far from either yahrzeit
    await sendDailyYahrzeitPush({ now, Synagogue: makeModel([doc], updates), clientOverride: fakeClient() });
    assert.equal(updates.length, 1);
  });

  it('skips a community with no subscriptions', async () => {
    const doc = community();
    const updates = [];
    const result = await sendDailyYahrzeitPush({
      now: new Date('2026-11-08T09:00:00Z'),
      Synagogue: makeModel([doc], updates),
      clientOverride: fakeClient(),
    });
    assert.equal(result.sent, 0);
    assert.equal(updates.length, 0);
  });

  it('dry run sends and records nothing', async () => {
    const subs = upsertPushSubscription([], {
      endpoint: 'https://push.example.com/a', keys: { p256dh: 'k', auth: 'a' },
    });
    const updates = [];
    const client = fakeClient();
    await sendDailyYahrzeitPush({
      now: new Date('2026-11-08T09:00:00Z'),
      dryRun: true,
      Synagogue: makeModel([community({ pushSubscriptions: subs })], updates),
      clientOverride: client,
    });
    assert.equal(client.sent.length, 0);
    assert.equal(updates.length, 0);
  });
});

describe('1.34.0 I53 scheduler', () => {
  it('is disabled by DISABLE_PUSH_SCHEDULER', () => {
    assert.equal(isSchedulerDisabled({ DISABLE_PUSH_SCHEDULER: '1' }), true);
    assert.equal(isSchedulerDisabled({ DISABLE_PUSH_SCHEDULER: 'true' }), true);
    assert.equal(isSchedulerDisabled({}), false);
  });

  it('does not run during the first seconds after boot', async () => {
    let runs = 0;
    const handle = startPushScheduler({
      env: {},
      startDelayMs: 60 * 60 * 1000, // an hour: nothing can fire during this test
      run: async () => { runs += 1; },
      logger: { warn() {} },
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(runs, 0);
    handle.stop();
  });

  it('runs the email channel too, and one failing channel never blocks the other', async () => {
    const calls = [];
    const warnings = [];
    const result = await runDailyChecks({
      now: new Date('2026-11-04T10:00:00Z'),
      sendPush: async () => { calls.push('push'); throw new Error('push boom'); },
      sendEmail: async () => { calls.push('email'); return { sent: 1, skipped: 0 }; },
      logger: { warn: (...args) => warnings.push(args.join(' ')) },
    });
    assert.deepEqual(calls, ['push', 'email']);
    assert.equal(result.push, null);
    assert.deepEqual(result.email, { sent: 1, skipped: 0 });
    assert.equal(warnings.length, 1);
  });

  it('never throws out of a failing run', async () => {
    const warnings = [];
    const handle = startPushScheduler({
      env: {},
      startDelayMs: 60 * 60 * 1000,
      run: async () => { throw new Error('boom'); },
      logger: { warn: (...args) => warnings.push(args.join(' ')) },
    });
    // runNow exercises the same guarded path the timer uses.
    assert.equal(await handle.runNow(), null);
    assert.equal(warnings.length, 1);
    handle.stop();
  });
});
