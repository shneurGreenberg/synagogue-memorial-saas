const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { translateViaOpenRouter, extractChatContent } = require('../lib/jewish-feed');

test('1.29.4: OpenRouter content as array of parts is parsed', () => {
  assert.equal(extractChatContent({ choices: [{ message: { content: [{ type: 'text', text: 'שלום' }] } }] }), 'שלום');
  assert.equal(extractChatContent({ choices: [{ message: { content: 'שלום' } }] }), 'שלום');
});

test('1.29.4: OpenRouter HTTP error is logged without the key and returns empty', async () => {
  const warns = []; const orig = console.warn; console.warn = (m) => warns.push(String(m));
  try {
    const out = await translateViaOpenRouter('x', 'he', { OPENROUTER_API_KEY: 'sk-secret' }, async () => ({ ok: false, status: 401, text: async () => '{"error":"bad key"}' }));
    assert.equal(out, '');
  } finally { console.warn = orig; }
  assert.ok(warns.some((w) => w.includes('HTTP 401')));
  assert.ok(!warns.some((w) => w.includes('sk-secret')));
});

test('1.29.4: Hebrew board falls back to English text instead of hiding', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'jewish-feed.js'), 'utf8');
  assert.match(src, /if \(!text && englishText\) \{\s*text = englishText;/);
});
