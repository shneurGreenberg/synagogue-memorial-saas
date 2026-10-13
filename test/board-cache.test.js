const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { setBoardCache, getBoardContentVersion, invalidateBoardCache } = require('../lib/board-cache');
const { _cacheForTests: yahrzeitCache } = require('../lib/admin-yahrzeit-cache');

describe('board cache', () => {
  beforeEach(() => {
    invalidateBoardCache();
    yahrzeitCache.clear();
  });

  it('stores content version with cached board payload', () => {
    const board = {
      slug: 'demo',
      title: 'Demo',
      people: [{ id: 1, name: 'A' }],
      __peopleTextFingerprint: 'abc',
    };
    setBoardCache('demo', board);
    assert.equal(getBoardContentVersion('demo'), getBoardContentVersion('demo'));
  });

  it('invalidateBoardCache clears yahrzeit compute cache for slug', () => {
    yahrzeitCache.set('demo:count:x', { value: 3, expiresAt: Date.now() + 60000 });
    invalidateBoardCache('demo');
    assert.equal(yahrzeitCache.has('demo:count:x'), false);
  });
});
