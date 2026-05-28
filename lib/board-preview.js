function applyBoardPreviewOverrides(synagogue, query) {
  if (!synagogue) {
    return synagogue;
  }

  const hasPreviewParams = query && (
    query.title
    || query.primaryColor
    || query.textColor
  );

  if (!hasPreviewParams) {
    return synagogue;
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

  return preview;
}

module.exports = {
  applyBoardPreviewOverrides,
};
