/**
 * Regression coverage map for fixes noted in CHANGELOG 1.10–1.15 (see docs/TESTING.md).
 */
const REGRESSION_AREAS = [
  { topic: 'multipart vs urlencoded admin forms', tests: ['test/admin-parse-form-body.test.js', 'test/admin-post-routes.test.js'] },
  { topic: 'admin POST timeout / multipart without boundary', tests: ['test/admin-post-routes.test.js'] },
  { topic: 'saved-view export Hebrew Content-Disposition', tests: ['test/saved-view-export.test.js'] },
  { topic: 'weekly Chumash parsha/aliyah (Oct 2026)', tests: ['test/weekly-chumash.test.js', 'test/jewish-feed-chumash.test.js'] },
  { topic: 'mojibake scan', tests: ['test/no-mojibake.test.js'] },
  { topic: 'upcoming holidays window / Sigd / ranges', tests: ['test/upcoming-holidays.test.js', 'test/regression-holidays.test.js'] },
  { topic: 'Chabad dates through next month', tests: ['test/chabad-dates.test.js'] },
  { topic: 'Hebrew gematria dates', tests: ['test/hebrew-date-format.test.js'] },
  { topic: 'saved-view design-only portable', tests: ['test/saved-view-design.test.js', 'test/saved-view-export.test.js'] },
  { topic: 'MyMemory warning filter', tests: ['test/mymemory-translate.test.js'] },
  { topic: 'ב״ה gershayim in templates', tests: ['test/templates-beh.test.js'] },
  { topic: 'preset saved views idempotent', tests: ['test/saved-view-presets.test.js'] },
  { topic: 'wrong community page', tests: ['test/admin-wrong-community.test.js', 'test/admin-tenant-isolation.test.js'] },
  { topic: 'QR toggles unchecked -> false', tests: ['test/saved-view-portable.test.js'] },
  { topic: 'CSS ?v= cache bust', tests: ['test/layout-cache-bust.test.js'] },
  { topic: 'CHANGELOG validity', tests: ['test/changelog.test.js'] },
  { topic: 'server syntax', tests: ['test/server-syntax.test.js'] },
];

module.exports = { REGRESSION_AREAS };
