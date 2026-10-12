const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { communityLogoUrl } = require('../lib/community-logo-url');

describe('communityLogoUrl', () => {
  it('builds a local images path from theme logo', () => {
    assert.equal(
      communityLogoUrl({ theme: { logo: 'novosibirsk-logo.png' } }),
      '/images/novosibirsk-logo.png',
    );
  });

  it('uses the default banner when logo is missing', () => {
    assert.equal(communityLogoUrl({}), '/images/banner-transparent.png');
  });

  it('passes through absolute http URLs', () => {
    assert.equal(
      communityLogoUrl({ theme: { logo: 'https://cdn.example/logo.png' } }),
      'https://cdn.example/logo.png',
    );
  });
});
