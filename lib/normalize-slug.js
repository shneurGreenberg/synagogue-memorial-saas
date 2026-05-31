const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeSlug(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isValidSlug(slug) {
  return Boolean(slug) && SLUG_PATTERN.test(slug);
}

module.exports = {
  normalizeSlug,
  isValidSlug,
  SLUG_PATTERN,
};
