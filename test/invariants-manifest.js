/**
 * Logical invariants the suite is expected to uphold (see docs/TESTING.md).
 * Each entry: { id, area, description }
 */
const INVARIANTS = [
  { id: 'tenant-board-payload', area: 'tenant', description: 'Public board payload never exposes contacts, admin users, saved views, or provisioning for any community.' },
  { id: 'tenant-admin-slug-mismatch', area: 'tenant', description: 'Admin session for community A cannot use /admin/B/* routes (friendly wrong-community page or 403 JSON).' },
  { id: 'tenant-admin-mutations', area: 'tenant', description: 'Admin POST/PUT/DELETE under wrong slug does not mutate another community\'s data.' },
  { id: 'tenant-board-api-slug', area: 'tenant', description: 'Board APIs load data only for req.params.slug (no cross-tenant reads).' },
  { id: 'admin-auth-enumerated', area: 'auth', description: 'Every admin /:slug route declares requireAdmin except login/logout.' },
  { id: 'master-auth-enumerated', area: 'auth', description: 'Every master route declares requireMaster/requireMasterApi except login/logout.' },
  { id: 'slug-unique-valid', area: 'data', description: 'Community slug is unique in MongoDB and matches normalize-slug pattern.' },
  { id: 'timezone-per-community', area: 'calendar', description: 'Yahrzeit and Chumash calculations use synagogue.location.timezone.' },
  { id: 'uploads-shared-dirs', area: 'storage', description: 'Upload filenames are unique; photos vs images dirs are separated per deployment (not per slug path).' },
  { id: 'saved-view-design-roundtrip', area: 'design', description: 'Export/import/apply preserves design fields only; branding and QR toggles stay on community.' },
  { id: 'hebrew-gregorian', area: 'calendar', description: 'Hebrew death dates derive from Gregorian via Hebcal; stored Hebrew preferred when present.' },
  { id: 'yahrzeit-after-sunset', area: 'calendar', description: 'Death after sunset shifts Hebrew date (halachic rule).' },
  { id: 'leap-adar', area: 'calendar', description: 'Leap years and Adar I/II handled correctly in Hebrew date conversion.' },
  { id: 'i18n-keys', area: 'i18n', description: 'Board UI translation keys match across he, ru, en resource files.' },
  { id: 'no-mojibake', area: 'encoding', description: 'Source and locale files are valid UTF-8 without mojibake sequences.' },
];

module.exports = { INVARIANTS };
