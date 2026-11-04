/**
 * 1.34.0 I53: daily "yahrzeit is coming" phone notification for admins who installed the app.
 *
 * The email reminder in lib/yahrzeit-reminders.js is untouched. This is a separate, opt-in channel:
 * only communities with `yahrzeitPush.enabled` and at least one subscription are considered.
 *
 * It runs once per local day per community (guarded by `yahrzeitPush.lastNotifiedDate`), which is
 * also the dedupe: a restart or a second scheduler tick on the same day sends nothing.
 */

const { getDatePartsInTimezone, getDayKeyInTimezone, resolveSynagogueTimezone, resolveYahrzeitOptions, isYahrzeitOnDate } = require('./yahrzeit');
const { normalizeSubscriptionPayload, sendPushToSubscriptions } = require('./web-push');

const LOOKAHEAD_DAYS = 60;

function normalizeYahrzeitPush(raw) {
  const source = raw || {};
  const days = Number(source.daysBefore);
  return {
    enabled: source.enabled === true,
    daysBefore: Number.isFinite(days) ? Math.min(60, Math.max(0, Math.round(days))) : 3,
    lastNotifiedDate: String(source.lastNotifiedDate || '').trim(),
  };
}

function parseYahrzeitPushFromBody(body) {
  const source = body || {};
  const parsed = { enabled: false, daysBefore: 3 };
  if ('yahrzeitPushEnabled' in source) {
    parsed.enabled = source.yahrzeitPushEnabled === '1' || source.yahrzeitPushEnabled === 'on';
  }
  if ('yahrzeitPushDaysBefore' in source) {
    parsed.daysBefore = source.yahrzeitPushDaysBefore;
  }
  return normalizeYahrzeitPush(parsed);
}

/** Local calendar date `offsetDays` away from `now`, as a plain Date in that timezone. */
function addDaysInTimezone(timezone, now, offsetDays) {
  const parts = getDatePartsInTimezone(timezone, now);
  const base = new Date(parts.year, parts.month - 1, parts.day);
  base.setDate(base.getDate() + offsetDays);
  return base;
}

/**
 * Yahrzeits that fall in the next `daysBefore` days (today included), in the community timezone.
 * Returns `{ person, date, daysAway }` newest-nearest first.
 */
function findUpcomingYahrzeits(synagogue, now = new Date(), daysBefore = 3) {
  const timezone = resolveSynagogueTimezone(synagogue);
  const options = resolveYahrzeitOptions(synagogue);
  const window = Math.min(LOOKAHEAD_DAYS, Math.max(0, Number(daysBefore) || 0));
  const people = Array.isArray(synagogue && synagogue.people) ? synagogue.people : [];
  const out = [];

  for (let offset = 0; offset <= window; offset += 1) {
    const date = addDaysInTimezone(timezone, now, offset);
    people.forEach((person) => {
      if (!person) return;
      if (!isYahrzeitOnDate(person, date, options)) return;
      out.push({ person, date, daysAway: offset });
    });
  }

  return out;
}

function formatUpcomingLine(entry) {
  const name = (entry && entry.person && entry.person.name) || '';
  const date = entry && entry.date instanceof Date
    ? `${String(entry.date.getDate()).padStart(2, '0')}/${String(entry.date.getMonth() + 1).padStart(2, '0')}/${entry.date.getFullYear()}`
    : '';
  return { name, date };
}

/** Build the push payload shown on the phone. */
function buildYahrzeitPushPayload(entries, { today = false } = {}) {
  if (!entries || !entries.length) return null;
  const first = entries[0];
  const { name, date } = formatUpcomingLine(first);
  const noun = today ? 'יארצייט היום' : 'יארצייט קרוב';
  const title = `${noun}: ${name}`;
  const body = entries.length > 1
    ? `${date} · ועוד ${entries.length - 1}`
    : date;
  return { title, body, tag: 'yahrzeit', url: '/admin/', dir: 'rtl', lang: 'he' };
}

/**
 * One pass over all communities. `dryRun` skips both the send and the lastNotifiedDate write.
 * `clientOverride` lets tests inject a fake push client.
 */
async function sendDailyYahrzeitPush({
  now = new Date(),
  dryRun = false,
  Synagogue,
  clientOverride = null,
} = {}) {
  const Model = Synagogue || require('../models/Synagogue');
  if (!Model) return { checked: 0, sent: 0, communities: 0, skipped: 0 };

  const synagogues = await Model.find({
    'yahrzeitPush.enabled': true,
  }).lean();

  let sent = 0;
  let communities = 0;
  let skipped = 0;

  for (const synagogue of synagogues) {
    const settings = normalizeYahrzeitPush(synagogue.yahrzeitPush);
    const timezone = resolveSynagogueTimezone(synagogue);
    const dayKey = getDayKeyInTimezone(timezone, now);
    if (!settings.enabled || settings.lastNotifiedDate === dayKey) {
      skipped += 1;
      continue;
    }

    const subscriptions = (synagogue.pushSubscriptions || [])
      .map((entry) => normalizeSubscriptionPayload(entry))
      .filter(Boolean);
    if (!subscriptions.length) {
      skipped += 1;
      continue;
    }

    const entries = findUpcomingYahrzeits(synagogue, now, settings.daysBefore);
    if (!entries.length) {
      skipped += 1;
      // Nothing to announce: record the day anyway so we don't scan this community again today.
      if (!dryRun) {
        await Model.updateOne({ slug: synagogue.slug }, { $set: { 'yahrzeitPush.lastNotifiedDate': dayKey } });
      }
      continue;
    }

    const payload = buildYahrzeitPushPayload(entries, { today: entries[0].daysAway === 0 });
    if (!payload) {
      skipped += 1;
      continue;
    }

    if (dryRun) {
      communities += 1;
      continue;
    }

    const result = await sendPushToSubscriptions(synagogue.pushSubscriptions, payload, { clientOverride });
    sent += result.sent;
    communities += 1;

    const update = { 'yahrzeitPush.lastNotifiedDate': dayKey };
    if (result.dropped && result.dropped.length) {
      // Drop dead devices in the same write that records the day.
      const { removePushSubscription } = require('./web-push');
      let remaining = synagogue.pushSubscriptions || [];
      result.dropped.forEach((endpoint) => { remaining = removePushSubscription(remaining, endpoint); });
      update.pushSubscriptions = remaining;
    }
    await Model.updateOne({ slug: synagogue.slug }, { $set: update });
  }

  return { checked: synagogues.length, communities, sent, skipped };
}

module.exports = {
  normalizeYahrzeitPush,
  parseYahrzeitPushFromBody,
  findUpcomingYahrzeits,
  buildYahrzeitPushPayload,
  sendDailyYahrzeitPush,
};
