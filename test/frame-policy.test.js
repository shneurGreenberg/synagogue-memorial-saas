const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_FRAME_ANCESTORS,
  parseFrameAncestors,
  isEmbeddablePath,
  mergeFrameAncestors,
  createFramePolicyMiddleware,
} = require('../lib/frame-policy');

function run(path, preset = {}, options = {}) {
  const headers = { ...preset };
  const res = {
    setHeader: (k, v) => { headers[k.toLowerCase()] = v; },
    getHeader: (k) => headers[k.toLowerCase()],
    removeHeader: (k) => { delete headers[k.toLowerCase()]; },
  };
  let called = false;
  createFramePolicyMiddleware(options)({ path }, res, () => { called = true; });
  assert.equal(called, true);
  return headers;
}

describe('frame policy', () => {
  it('parses env list with spaces or commas and defaults', () => {
    assert.deepEqual(parseFrameAncestors(''), ["'self'", ...DEFAULT_FRAME_ANCESTORS]);
    assert.deepEqual(parseFrameAncestors('https://a.test, https://b.test  https://c.test'),
      ["'self'", 'https://a.test', 'https://b.test', 'https://c.test']);
  });

  it('classifies embeddable paths', () => {
    assert.equal(isEmbeddablePath('/s/novosibirsk'), true);
    assert.equal(isEmbeddablePath('/s/novosibirsk/api/board'), true);
    assert.equal(isEmbeddablePath('/s/novosibirsk/scan'), false);
    assert.equal(isEmbeddablePath('/admin/login'), false);
    assert.equal(isEmbeddablePath('/master'), false);
    assert.equal(isEmbeddablePath('/sx'), false);
  });

  it('merges frame-ancestors into existing CSP', () => {
    assert.equal(
      mergeFrameAncestors("default-src 'self'; frame-ancestors 'none'", ["'self'", 'https://a.test']),
      "default-src 'self'; frame-ancestors 'self' https://a.test"
    );
  });

  it('sets CSP and no XFO on boards, SAMEORIGIN elsewhere', () => {
    const board = run('/s/novosibirsk', { 'x-frame-options': 'SAMEORIGIN' }, { frameAncestors: '' });
    assert.equal(board['x-frame-options'], undefined);
    assert.match(board['content-security-policy'], /frame-ancestors 'self' https:\/\/jewish-community-web-shneur\.amvera\.io/);
    assert.match(board['content-security-policy'], /https:\/\/jewishsib\.ru/);

    const admin = run('/admin/login');
    assert.equal(admin['x-frame-options'], 'SAMEORIGIN');
    assert.equal(admin['content-security-policy'], undefined);

    const scan = run('/s/novosibirsk/scan');
    assert.equal(scan['x-frame-options'], 'SAMEORIGIN');
  });
});
