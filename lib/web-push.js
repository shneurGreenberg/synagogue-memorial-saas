/**
 * 1.34.0 I53: phone push notifications for the admin PWA.
 *
 * Keys come ONLY from the environment (WEB_PUSH_PUBLIC_KEY / WEB_PUSH_PRIVATE_KEY). They are never
 * hardcoded and never written to the repo. Without them the feature stays off and a single warning
 * is logged — the app must never crash over a missing optional key.
 */

const PUBLIC_KEY = String(process.env.WEB_PUSH_PUBLIC_KEY || '').trim();
const PRIVATE_KEY = String(process.env.WEB_PUSH_PRIVATE_KEY || '').trim();

let warned = false;
let client = null;
let configured = false;

function isWebPushConfigured() {
  return !!(PUBLIC_KEY && PRIVATE_KEY);
}

function warnOnce() {
  if (warned) return;
  warned = true;
  // Never print the keys or any part of them.
  console.warn('[push] WEB_PUSH_PUBLIC_KEY / WEB_PUSH_PRIVATE_KEY are not set — phone push is off.');
}

/** Lazy client: only touches web-push when keys exist, so a keyless install never loads it. */
function getClient() {
  if (client) return client;
  if (!isWebPushConfigured()) {
    warnOnce();
    return null;
  }
  try {
    const webpush = require('web-push');
    webpush.setVapidDetails(
      String(process.env.WEB_PUSH_SUBJECT || 'mailto:admin@kaddish.local'),
      PUBLIC_KEY,
      PRIVATE_KEY,
    );
    client = webpush;
    configured = true;
    return client;
  } catch (err) {
    if (!warned) {
      warned = true;
      console.warn('[push] web-push could not be initialised, phone push is off.');
    }
    return null;
  }
}

function getPublicKey() {
  return isWebPushConfigured() ? PUBLIC_KEY : '';
}

/** Normalize a browser PushSubscription JSON into what the model stores. */
function normalizeSubscriptionPayload(raw) {
  const source = raw || {};
  const endpoint = String(source.endpoint || '').trim();
  const keys = source.keys && typeof source.keys === 'object' ? source.keys : {};
  const p256dh = String(keys.p256dh || '').trim();
  const auth = String(keys.auth || '').trim();
  if (!endpoint || !p256dh || !auth) return null;
  // Only real push services are accepted (http(s), no javascript:/data: endpoints).
  if (!/^https?:\/\//i.test(endpoint)) return null;
  return {
    endpoint: endpoint.slice(0, 2000),
    keys: { p256dh: p256dh.slice(0, 200), auth: auth.slice(0, 100) },
    userAgent: String(source.userAgent || '').slice(0, 300),
  };
}

/** Add a subscription, replacing an existing entry with the same endpoint (never duplicating). */
function upsertPushSubscription(subscriptions, entry, now = new Date()) {
  const list = Array.isArray(subscriptions) ? subscriptions.slice() : [];
  if (!entry || !entry.endpoint) return list;
  const index = list.findIndex((item) => item && item.endpoint === entry.endpoint);
  const record = {
    endpoint: entry.endpoint,
    keys: { ...(entry.keys || {}) },
    userAgent: entry.userAgent || '',
    createdAt: now,
    lastSeenAt: now,
  };
  if (index >= 0) {
    list[index] = { ...list[index], ...record, createdAt: list[index].createdAt || now };
  } else {
    list.push(record);
  }
  return list;
}

function removePushSubscription(subscriptions, endpoint) {
  const list = Array.isArray(subscriptions) ? subscriptions : [];
  const target = String(endpoint || '').trim();
  if (!target) return list.slice();
  return list.filter((item) => item && item.endpoint !== target);
}

/** Send one notification to every subscription; drops the ones the push service says are gone. */
async function sendPushToSubscriptions(subscriptions, payload, {
  clientOverride = null,
  now = new Date(),
} = {}) {
  const list = Array.isArray(subscriptions) ? subscriptions : [];
  const push = clientOverride || getClient();
  if (!push || !list.length) {
    return { sent: 0, removed: 0, failed: 0, dropped: [], reason: push ? 'no_subscriptions' : 'not_configured' };
  }

  const body = JSON.stringify(payload || {});
  let sent = 0;
  let failed = 0;
  const dropped = [];

  for (const entry of list) {
    if (!entry || !entry.endpoint) continue;
    try {
      await push.sendNotification(
        { endpoint: entry.endpoint, keys: entry.keys || {} },
        body,
      );
      sent += 1;
    } catch (err) {
      const status = err && (err.statusCode || (err.error && err.error.statusCode));
      // 404/410 = the device is gone for good, so forget it.
      if (status === 404 || status === 410) {
        dropped.push(entry.endpoint);
      } else {
        failed += 1;
      }
    }
  }

  void now;
  return { sent, failed, removed: dropped.length, dropped };
}

/** Test seam: replace the client (tests pass a fake) and reset the warn-once flag. */
function __setClientForTests(fake) {
  client = fake;
  warned = false;
}

module.exports = {
  isWebPushConfigured,
  getPublicKey,
  normalizeSubscriptionPayload,
  upsertPushSubscription,
  removePushSubscription,
  sendPushToSubscriptions,
  __setClientForTests,
};
