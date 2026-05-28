function applyBoardPreviewOverrides(synagogue, query) {
  if (!synagogue) {
    return synagogue;
  }

  const isPreview = query && (
    query.preview === '1'
    || query.title
    || query.titleRu
    || query.titleEn
    || query.titleHe
    || query.primaryColor
    || query.textColor
    || query.previewLang
  );

  if (!isPreview) {
    return synagogue;
  }

  const preview = synagogue.toObject ? synagogue.toObject() : { ...synagogue };
  preview.theme = { ...(preview.theme || {}) };
  preview.titles = { ...(preview.titles || {}) };

  if (query.title) {
    preview.title = query.title;
    preview.titles.ru = query.title;
  }
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
