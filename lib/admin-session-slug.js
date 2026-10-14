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

module.exports = {
  adminSlugMismatch,
  loginUrlForSlug,
};
