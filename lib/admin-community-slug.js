/** Slug shape for synagogue communities in /admin/:slug/* URLs. */
const COMMUNITY_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

/**
 * First path segments under /admin/:slug that are real routes, not community slugs.
 * When Express mis-parses /admin//people/... the :slug param can capture these.
 */
const RESERVED_ADMIN_ROUTE_SEGMENTS = new Set([
  'contact-directory',
  'contacts',
  'dashboard',
  'end-master-impersonation',
  'events',
  'login',
  'logout',
  'my-preferences',
  'people',
  'person-add-requests',
  'preview-board',
  'publish-version',
  'refresh-screens',
  'settings',
  'slideshow',
  'users',
  'yahrzeit',
]);

function normalizeAdminRouteSlugParam(value) {
  return String(value || '').trim();
}

function isReservedAdminRouteSegment(segment) {
  const normalized = normalizeAdminRouteSlugParam(segment).toLowerCase();
  return RESERVED_ADMIN_ROUTE_SEGMENTS.has(normalized);
}

function isValidCommunitySlugFormat(slug) {
  const normalized = normalizeAdminRouteSlugParam(slug);
  return normalized.length > 0 && COMMUNITY_SLUG_RE.test(normalized);
}

function isRoutableAdminCommunitySlug(slug) {
  const normalized = normalizeAdminRouteSlugParam(slug);
  if (!isValidCommunitySlugFormat(normalized)) {
    return false;
  }
  return !isReservedAdminRouteSegment(normalized);
}

module.exports = {
  normalizeAdminRouteSlugParam,
  isReservedAdminRouteSegment,
  isValidCommunitySlugFormat,
  isRoutableAdminCommunitySlug,
  RESERVED_ADMIN_ROUTE_SEGMENTS,
};
