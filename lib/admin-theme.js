function resolveAdminColorMode(synagogue) {
  if (!synagogue) {
    return 'dark';
  }

  if (synagogue.adminTheme && synagogue.adminTheme.colorMode) {
    return synagogue.adminTheme.colorMode === 'light' ? 'light' : 'dark';
  }

  // Legacy: colorMode was briefly stored on theme for the public board
  if (synagogue.theme && synagogue.theme.colorMode === 'light') {
    return 'light';
  }

  return 'dark';
}

function enrichSynagogueForAdmin(synagogue) {
  if (!synagogue) {
    return synagogue;
  }

  const doc = synagogue.toObject ? synagogue.toObject() : { ...synagogue };
  doc.adminColorMode = resolveAdminColorMode(doc);
  doc.theme = { ...(doc.theme || {}) };
  const gap = parseInt(doc.theme.gridGap, 10);
  doc.theme.gridGap = Number.isFinite(gap) ? Math.min(32, Math.max(0, gap)) : 8;
  return doc;
}

module.exports = {
  resolveAdminColorMode,
  enrichSynagogueForAdmin,
};
