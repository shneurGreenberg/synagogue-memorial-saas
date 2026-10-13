const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { ifNoneMatchSatisfied, normalizeEtag } = require('../lib/http-etag');
const { computeSidebarAppEtag } = require('../lib/sidebar-app-etag');

describe('http etag helpers', () => {
  it('normalizes bare hashes to quoted etags', () => {
    assert.equal(normalizeEtag('abc'), '"abc"');
    assert.equal(normalizeEtag('"abc"'), '"abc"');
  });

  it('matches If-None-Match lists', () => {
    const req = { headers: { 'if-none-match': '"a", "b"' } };
    assert.equal(ifNoneMatchSatisfied(req, 'b'), true);
    assert.equal(ifNoneMatchSatisfied(req, 'c'), false);
  });

  it('sidebar etag ignores updatedAt', () => {
    const a = { slug: 'x', title: 'T', updatedAt: '2026-01-01T00:00:00.000Z' };
    const b = { slug: 'x', title: 'T', updatedAt: '2026-01-02T00:00:00.000Z' };
    assert.equal(computeSidebarAppEtag(a), computeSidebarAppEtag(b));
  });
});
