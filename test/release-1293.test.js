const test = require('node:test');
const assert = require('node:assert/strict');
const { translateViaOpenRouter } = require('../lib/jewish-feed');

test('1.29.3: OpenRouter fallback returns translated text', async () => {
  let sent;
  const fetchImpl = async (url, opts) => { sent = { url, opts }; return { ok: true, json: async () => ({ choices: [{ message: { content: 'יש לשמור על הזמן.' } }] }) }; };
  const out = await translateViaOpenRouter('Time must be guarded.', 'he', { OPENROUTER_API_KEY: 'k' }, fetchImpl);
  assert.equal(out, 'יש לשמור על הזמן.');
  assert.match(sent.url, /openrouter\.ai/);
  assert.match(JSON.parse(sent.opts.body).messages[0].content, /Hebrew/);
});

test('1.29.3: no key means no call', async () => {
  const out = await translateViaOpenRouter('x', 'he', {}, async () => { throw new Error('called'); });
  assert.equal(out, '');
});
