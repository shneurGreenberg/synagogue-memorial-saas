const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  adminSlugMismatch,
  loginUrlForSlug,
  safeAdminLogoutNext,
} = require('../lib/admin-session-slug');
const {
  isRoutableAdminCommunitySlug,
  isReservedAdminRouteSegment,
} = require('../lib/admin-community-slug');

describe('admin wrong community', () => {
  it('detects slug mismatch when session is for another community', () => {
    const req = {
      session: { adminSlug: 'alpha' },
      params: { slug: 'beta' },
    };
    assert.equal(adminSlugMismatch(req), true);
  });

  it('does not treat reserved admin route segments as a community slug', () => {
    const req = {
      session: { adminSlug: 'kaliningrad' },
      params: { slug: 'person-add-requests' },
    };
    assert.equal(isReservedAdminRouteSegment('person-add-requests'), true);
    assert.equal(isRoutableAdminCommunitySlug('person-add-requests'), false);
    assert.equal(adminSlugMismatch(req), false);
  });

  it('ignores empty slug segments', () => {
    const req = {
      session: { adminSlug: 'kaliningrad' },
      params: { slug: '   ' },
    };
    assert.equal(adminSlugMismatch(req), false);
  });

  it('builds login URL with slug prefill and dashboard next', () => {
    const url = loginUrlForSlug('novosibirsk');
    assert.match(url, /^\/admin\/login\?/);
    assert.ok(url.includes('slug=novosibirsk'));
    assert.ok(url.includes('next=%2Fadmin%2Fnovosibirsk%2Fdashboard'));
  });

  it('allows logout redirect back to login with query string', () => {
    const login = loginUrlForSlug('beta');
    assert.equal(safeAdminLogoutNext(login), login);
  });
});
