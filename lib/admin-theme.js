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
  return doc;
}

module.exports = {
  resolveAdminColorMode,
  enrichSynagogueForAdmin,
};
