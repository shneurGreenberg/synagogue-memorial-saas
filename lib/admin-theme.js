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
  doc.theme = { ...(doc.theme || {}) };
  return doc;
}

module.exports = {
  resolveAdminColorMode,
  normalizeTitles,
  enrichSynagogueForAdmin,
};
