function applyBoardPreviewOverrides(synagogue, query) {
  if (!synagogue) {
    return synagogue;
  }

  const hasPreviewParams = query && (
    query.title
    || query.primaryColor
    || query.textColor
    || query.gridGap !== undefined
  );

  if (!hasPreviewParams) {
    return ensureThemeDefaults(synagogue);
  }

  const preview = synagogue.toObject ? synagogue.toObject() : { ...synagogue };
  preview.theme = { ...(preview.theme || {}) };

  if (query.title) {
    preview.title = query.title;
  }
  if (query.primaryColor) {
    preview.theme.primaryColor = query.primaryColor;
  }
  if (query.textColor) {
    preview.theme.textColor = query.textColor;
  }
  if (query.gridGap !== undefined && query.gridGap !== '') {
    preview.theme.gridGap = Math.min(32, Math.max(0, parseInt(query.gridGap, 10) || 0));
  }

  return ensureThemeDefaults(preview);
}

function ensureThemeDefaults(synagogue) {
  const doc = synagogue.toObject ? synagogue.toObject() : { ...synagogue };
  doc.theme = { ...(doc.theme || {}) };

  const gap = parseInt(doc.theme.gridGap, 10);
  doc.theme.gridGap = Number.isFinite(gap) ? Math.min(32, Math.max(0, gap)) : 8;

  return doc;
}

module.exports = {
  applyBoardPreviewOverrides,
  ensureThemeDefaults,
};
