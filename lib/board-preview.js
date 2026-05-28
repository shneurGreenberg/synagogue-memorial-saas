function applyBoardPreviewOverrides(synagogue, query) {
  if (!synagogue) {
    return synagogue;
  }

  const hasPreviewParams = query && (
    query.title
    || query.titleRu
    || query.titleEn
    || query.titleHe
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
  preview.titles = { ...(preview.titles || {}) };
  if (query.titleRu !== undefined) {
    preview.titles.ru = query.titleRu;
  }
  if (query.titleEn !== undefined) {
    preview.titles.en = query.titleEn;
  }
  if (query.titleHe !== undefined) {
    preview.titles.he = query.titleHe;
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
