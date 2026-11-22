const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_PUBLIC_BASE_URL,
  resolvePublicBaseUrl,
  resolveCommunityBaseUrl,
  communityPublicPath,
} = require('../lib/public-base-url');
const {
  resolveAddNameQrUrl,
  resolveDonationQrTargetUrl,
} = require('../lib/default-community-qr');

const RU = 'https://ru.example/';
const INTL = 'https://intl.example/';

function env(extra = {}) {
  return {
    PUBLIC_BASE_URL: INTL,
    PUBLIC_BASE_URL_RU: RU,
    ...extra,
  };
}

describe('public link region', () => {
  it('keeps PUBLIC_BASE_URL and the Warsaw default', () => {
    assert.equal(resolvePublicBaseUrl({}), DEFAULT_PUBLIC_BASE_URL);
    assert.equal(resolvePublicBaseUrl({ PUBLIC_BASE_URL: 'https://custom.example/' }), 'https://custom.example');
  });

  it('picks RU for a Russian timezone and INTL otherwise when region is auto', () => {
    const ruEnv = env();
    assert.equal(
      resolveCommunityBaseUrl({ location: { timezone: 'Asia/Novosibirsk' } }, ruEnv),
      'https://ru.example',
    );
    assert.equal(
      resolveCommunityBaseUrl({ location: { timezone: 'Europe/Moscow' } }, ruEnv),
      'https://ru.example',
    );
    assert.equal(
      resolveCommunityBaseUrl({ location: { timezone: 'America/New_York' } }, ruEnv),
      'https://intl.example',
    );
    assert.equal(
      resolveCommunityBaseUrl({ publicLinkRegion: 'auto', location: { timezone: 'Asia/Jerusalem' } }, ruEnv),
      'https://intl.example',
    );
  });

  it('honors explicit ru and intl', () => {
    const ruEnv = env();
    assert.equal(
      resolveCommunityBaseUrl({ publicLinkRegion: 'ru', location: { timezone: 'UTC' } }, ruEnv),
      'https://ru.example',
    );
    assert.equal(
      resolveCommunityBaseUrl({ publicLinkRegion: 'intl', location: { timezone: 'Europe/Kaliningrad' } }, ruEnv),
      'https://intl.example',
    );
  });

  it('always uses INTL when PUBLIC_BASE_URL_RU is empty', () => {
    const unset = { PUBLIC_BASE_URL: 'https://intl.example' };
    assert.equal(
      resolveCommunityBaseUrl({ publicLinkRegion: 'ru', location: { timezone: 'Europe/Moscow' } }, unset),
      'https://intl.example',
    );
    assert.equal(
      resolveCommunityBaseUrl({ location: { timezone: 'Asia/Vladivostok' } }, {}),
      DEFAULT_PUBLIC_BASE_URL,
    );
  });

  it('strips trailing slashes from both bases', () => {
    assert.equal(
      resolveCommunityBaseUrl({ publicLinkRegion: 'intl' }, {
        PUBLIC_BASE_URL_INTL: 'https://intl.example///',
        PUBLIC_BASE_URL_RU: 'https://ru.example///',
      }),
      'https://intl.example',
    );
    assert.equal(
      communityPublicPath('demo', 'add-name', env(), { publicLinkRegion: 'ru' }),
      'https://ru.example/s/demo/add-name',
    );
  });

  it('builds QR URLs from the community region', () => {
    const moscow = { publicLinkRegion: 'auto', location: { timezone: 'Europe/Moscow' } };
    const paris = { publicLinkRegion: 'auto', location: { timezone: 'Europe/Paris' } };
    const ruEnv = env();
    assert.equal(
      resolveAddNameQrUrl('msk', ruEnv, moscow),
      'https://ru.example/s/msk/add-name',
    );
    assert.equal(
      resolveDonationQrTargetUrl('msk', '', ruEnv, moscow),
      'https://ru.example/s/msk/donation-setup',
    );
    assert.equal(
      resolveAddNameQrUrl('paris', ruEnv, paris),
      'https://intl.example/s/paris/add-name',
    );
    assert.equal(
      resolveDonationQrTargetUrl('msk', 'https://give.example/msk', ruEnv, moscow),
      'https://give.example/msk',
    );
  });
});
