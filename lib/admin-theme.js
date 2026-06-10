const { BOARD_THEME_DEFAULTS } = require('./board-defaults');

function resolveAdminColorMode(synagogue) {
  if (!synagogue) {
    return 'dark';
  }

  if (synagogue.adminTheme && synagogue.adminTheme.colorMode) {
    return synagogue.adminTheme.colorMode === 'light' ? 'light' : 'dark';
  }

  if (synagogue.theme && synagogue.theme.colorMode === 'light') {
    return 'light';
  }

  return 'dark';
}

function normalizeTitles(doc) {
  const stored = doc.titles || {};
  const legacyTitle = String(doc.title || '').trim();

  return {
    ru: String(stored.ru || '').trim() || legacyTitle,
    en: String(stored.en || '').trim(),
    he: String(stored.he || '').trim(),
  };
}

function enrichSynagogueForAdmin(synagogue) {
  if (!synagogue) {
    return synagogue;
  }

  const doc = synagogue.toObject ? synagogue.toObject() : { ...synagogue };
  doc.titles = normalizeTitles(doc);
  doc.adminColorMode = resolveAdminColorMode(doc);
  doc.theme = {
    primaryColor: (doc.theme && doc.theme.primaryColor) || BOARD_THEME_DEFAULTS.primaryColor,
    textColor: (doc.theme && doc.theme.textColor) || BOARD_THEME_DEFAULTS.textColor,
    accentColor: (doc.theme && doc.theme.accentColor) || BOARD_THEME_DEFAULTS.accentColor,
    logo: (doc.theme && doc.theme.logo) || BOARD_THEME_DEFAULTS.logo,
    backgroundImage: (doc.theme && doc.theme.backgroundImage) || '',
    tilesBackground: (doc.theme && doc.theme.tilesBackground) || '',
  };
  return doc;
}

function sanitizeHexColor(value, fallback) {
  const candidate = String(value || '').trim();
  return /^#[0-9A-Fa-f]{6}$/.test(candidate) ? candidate : fallback;
}

module.exports = {
  resolveAdminColorMode,
  normalizeTitles,
  enrichSynagogueForAdmin,
  sanitizeHexColor,
};
