const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeSubscriptionPayload,
  upsertPushSubscription,
  removePushSubscription,
  sendPushToSubscriptions,
} = require('../lib/web-push');

const SUB = {
  endpoint: 'https://push.example.com/abc',
  keys: { p256dh: 'BPkA', auth: 'auth123' },
};

describe('1.34.0 I53 push subscriptions', () => {
  it('rejects incomplete or non-http endpoints', () => {
    assert.equal(normalizeSubscriptionPayload(null), null);
    assert.equal(normalizeSubscriptionPayload({ endpoint: 'https://x', keys: {} }), null);
    assert.equal(normalizeSubscriptionPayload({ endpoint: 'javascript:alert(1)', keys: SUB.keys }), null);
    assert.equal(normalizeSubscriptionPayload({ endpoint: 'https://x', keys: { p256dh: 'a', auth: 'b' } }).endpoint, 'https://x');
  });

  it('adds a subscription once and replaces the same endpoint instead of duplicating it', () => {
    let list = [];
    list = upsertPushSubscription(list, SUB);
    assert.equal(list.length, 1);
    list = upsertPushSubscription(list, SUB);
    assert.equal(list.length, 1);
    list = upsertPushSubscription(list, { ...SUB, endpoint: 'https://push.example.com/other' });
    assert.equal(list.length, 2);
  });

  it('removes by endpoint and survives an unknown endpoint', () => {
    const list = upsertPushSubscription(upsertPushSubscription([], SUB), { ...SUB, endpoint: 'https://push.example.com/other' });
    const next = removePushSubscription(list, SUB.endpoint);
    assert.equal(next.length, 1);
    assert.equal(next[0].endpoint, 'https://push.example.com/other');
    assert.equal(removePushSubscription(next, 'https://nope').length, 1);
    assert.equal(removePushSubscription(next, '').length, 1);
  });

  it('dedupes when the same device subscribes after rotating its keys', () => {
    let list = upsertPushSubscription([], SUB);
    list = upsertPushSubscription(list, { endpoint: SUB.endpoint, keys: { p256dh: 'NEW', auth: 'NEW' } });
    assert.equal(list.length, 1);
    assert.equal(list[0].keys.p256dh, 'NEW');
  });
});

describe('1.34.0 I53 push sending', () => {
  function fakeClient(behaviour) {
    const sent = [];
    return {
      sent,
      async sendNotification(subscription, body) {
        sent.push({ subscription, body });
        if (behaviour && behaviour.errorFor === subscription.endpoint) {
          const err = new Error('gone');
          err.statusCode = behaviour.statusCode;
          throw err;
        }
        return {};
      },
    };
  }

  it('sends to every live subscription', async () => {
    const client = fakeClient();
    const list = [SUB, { ...SUB, endpoint: 'https://push.example.com/other' }];
    const result = await sendPushToSubscriptions(list, { title: 'a' }, { clientOverride: client });
    assert.equal(result.sent, 2);
    assert.equal(result.removed, 0);
    assert.equal(client.sent.length, 2);
    assert.match(client.sent[0].body, /"title":"a"/);
  });

  it('drops subscriptions the push service reports as gone (404/410)', async () => {
    const client = fakeClient({ errorFor: SUB.endpoint, statusCode: 410 });
    const list = [SUB, { ...SUB, endpoint: 'https://push.example.com/other' }];
    const result = await sendPushToSubscriptions(list, { title: 'a' }, { clientOverride: client });
    assert.equal(result.sent, 1);
    assert.equal(result.removed, 1);
    assert.deepEqual(result.dropped, [SUB.endpoint]);
  });

  it('keeps a subscription when the failure is temporary', async () => {
    const client = fakeClient({ errorFor: SUB.endpoint, statusCode: 500 });
    const result = await sendPushToSubscriptions([SUB], { title: 'a' }, { clientOverride: client });
    assert.equal(result.sent, 0);
    assert.equal(result.failed, 1);
    assert.equal(result.removed, 0);
  });

  it('is a no-op with no subscriptions', async () => {
    const result = await sendPushToSubscriptions([], { title: 'a' }, { clientOverride: fakeClient() });
    assert.equal(result.sent, 0);
  });
});
