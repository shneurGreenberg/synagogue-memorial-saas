const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { currentCodeVersion } = require('../lib/changelog');
const { resolvePublishedVersion } = require('../lib/board-publish');

describe('board version API payload shape', () => {
  it('includes deployed code version alongside published screen version', () => {
    const payload = {
      version: 'etag-or-content-hash',
      publishedVersion: resolvePublishedVersion(3),
      codeVersion: currentCodeVersion(),
    };
    assert.match(payload.codeVersion, /^\d+\.\d+\.\d+$/);
    assert.equal(payload.publishedVersion, 3);
  });
});
