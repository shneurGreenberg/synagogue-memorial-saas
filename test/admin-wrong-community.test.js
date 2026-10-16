const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  adminSlugMismatch,
  loginUrlForSlug,
  safeAdminLogoutNext,
} = require('../lib/admin-session-slug');

describe('admin wrong community', () => {
  it('detects slug mismatch when session is for another community', () => {
    const req = {
      session: { adminSlug: 'alpha' },
      params: { slug: 'beta' },
    };
    assert.equal(adminSlugMismatch(req), true);
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
