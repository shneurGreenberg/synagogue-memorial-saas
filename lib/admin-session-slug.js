function adminSlugMismatch(req) {
  const sessionSlug = req.session && req.session.adminSlug;
  const routeSlug = req.params && req.params.slug;
  return !!(sessionSlug && routeSlug && routeSlug !== sessionSlug);
}

function loginUrlForSlug(slug) {
  const safeSlug = String(slug || '').trim();
  const next = safeSlug ? `/admin/${encodeURIComponent(safeSlug)}/dashboard` : '';
  const params = new URLSearchParams();
  if (safeSlug) {
    params.set('slug', safeSlug);
  }
  if (next) {
    params.set('next', next);
  }
  const query = params.toString();
  return query ? `/admin/login?${query}` : '/admin/login';
}

const ADMIN_NEXT_PATH = /^\/admin\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9][a-z0-9-]*)*$/i;

function safeAdminNextPath(value) {
  const raw = String(value || '').trim();
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.length > 512) {
    return '';
  }
  const pathOnly = raw.split('?')[0].split('#')[0];
  if (!ADMIN_NEXT_PATH.test(pathOnly)) {
    return '';
  }
  return raw.split('#')[0];
}

function safeAdminLogoutNext(value) {
  const raw = String(value || '').trim();
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.length > 1024) {
    return '';
  }
  if (raw.startsWith('/admin/login')) {
    return raw;
  }
  return safeAdminNextPath(raw);
}

function adminNextSlug(value) {
  const pathOnly = safeAdminNextPath(value).split('?')[0];
  const match = pathOnly.match(/^\/admin\/([a-z0-9]+(?:-[a-z0-9]+)*)/i);
  return match ? match[1] : '';
}

module.exports = {
  adminSlugMismatch,
  loginUrlForSlug,
  safeAdminNextPath,
  safeAdminLogoutNext,
  adminNextSlug,
};
