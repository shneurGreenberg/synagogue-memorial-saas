const PREVIEW_LANGS = ['ru', 'en', 'he'];

function mergePreviewPatch(synagogue, patch) {
  if (!synagogue || !patch) {
    return synagogue;
  }

  const next = synagogue.toObject ? synagogue.toObject() : { ...synagogue };
  next.theme = { ...(next.theme || {}) };
  next.titles = { ...(next.titles || {}) };

  if (patch.title) {
    next.title = patch.title;
    next.titles.ru = patch.title;
  }
  if (patch.titleRu !== undefined) {
    next.titles.ru = patch.titleRu;
  }
  if (patch.titleEn !== undefined) {
    next.titles.en = patch.titleEn;
  }
  if (patch.titleHe !== undefined) {
    next.titles.he = patch.titleHe;
  }
  if (patch.primaryColor) {
    next.theme.primaryColor = patch.primaryColor;
  }
  if (patch.textColor) {
    next.theme.textColor = patch.textColor;
  }
  if (patch.accentColor) {
    next.theme.accentColor = patch.accentColor;
  }
  if (patch.tileColor) {
    next.theme.tileColor = patch.tileColor;
  }
  if (patch.tileOpacity !== undefined && patch.tileOpacity !== '') {
    next.theme.tileOpacity = Number(patch.tileOpacity);
  }
  const fontScaleKeys = ['tileTitle', 'tileDate', 'clock', 'boardHeader', 'sidebar', 'prayers', 'prayerOverlay', 'torahNames'];
  fontScaleKeys.forEach((key) => {
    const value = patch[`fontScale_${key}`];
    if (value !== undefined && value !== '') {
      next.theme.fontScales = { ...(next.theme.fontScales || {}) };
      next.theme.fontScales[key] = Number(value);
    }
  });
  if (patch.previewLang && PREVIEW_LANGS.includes(patch.previewLang)) {
    next.language = patch.previewLang;
  }

  const memorialQrKeys = [
    'memorialQrTitleScale', 'memorialQrTextScale', 'memorialQrQrScale',
  ];
  const hasMemorialQr = memorialQrKeys.some((key) => patch[key] !== undefined && patch[key] !== '');
  if (hasMemorialQr) {
    const current = next.memorialQrPanel || {};
    next.memorialQrPanel = {
      titles: { ...(current.titles || {}) },
      texts: { ...(current.texts || {}) },
      titleScale: current.titleScale,
      textScale: current.textScale,
      qrScale: current.qrScale,
    };
    if (patch.memorialQrTitleScale !== undefined && patch.memorialQrTitleScale !== '') {
      next.memorialQrPanel.titleScale = Number(patch.memorialQrTitleScale);
    }
    if (patch.memorialQrTextScale !== undefined && patch.memorialQrTextScale !== '') {
      next.memorialQrPanel.textScale = Number(patch.memorialQrTextScale);
    }
    if (patch.memorialQrQrScale !== undefined && patch.memorialQrQrScale !== '') {
      next.memorialQrPanel.qrScale = Number(patch.memorialQrQrScale);
    }
  }

  return next;
}

function isPreviewQuery(query) {
  return query && (
    query.preview === '1'
    || query.title
    || query.titleRu !== undefined
    || query.titleEn !== undefined
    || query.titleHe !== undefined
    || query.primaryColor
    || query.textColor
    || query.accentColor
    || query.tileColor
    || query.tileOpacity
    || query.fontScale_tileTitle
    || query.previewLang
    || query.memorialQrTitleScale
  );
}

function applyBoardPreviewOverrides(synagogue, query) {
  if (!synagogue || !isPreviewQuery(query)) {
    return synagogue;
  }

  return mergePreviewPatch(synagogue, query);
}

module.exports = {
  mergePreviewPatch,
  applyBoardPreviewOverrides,
  isPreviewQuery,
};
