const { normalizeAdminLang } = require('./admin-locale');

/** Preferred admin UI labels per community slug (not timezone alias keys). */
const COMMUNITY_DISPLAY_NAMES = {
  tomsk: { he: 'טומסק', ru: 'Томск', en: 'Tomsk' },
  novosibirsk: { he: 'נובוסיבירסק', ru: 'Новосибирск', en: 'Novosibirsk' },
};

/**
 * Human-facing community name for admin (navbar, preferences).
 * Avoids joining timezone/city alias keys (e.g. "תומסק / טומסק").
 */
function resolveCommunityDisplayName(synagogue, adminLanguage) {
  const slug = String(synagogue?.slug || '').trim().toLowerCase();
  const lang = normalizeAdminLang(adminLanguage);
  const mapped = COMMUNITY_DISPLAY_NAMES[slug]?.[lang];
  if (mapped) {
    return mapped;
  }

  const raw = String(synagogue?.name || '').trim();
  if (!raw) {
    return slug;
  }

  if (raw.includes(' / ')) {
    const parts = raw.split(' / ').map((part) => part.trim()).filter(Boolean);
    if (slug === 'tomsk' && lang === 'he') {
      return 'טומסק';
    }
    return parts[0] || raw;
  }

  return raw;
}

module.exports = {
  COMMUNITY_DISPLAY_NAMES,
  resolveCommunityDisplayName,
};
