const PREVIEW_LANGS = ['ru', 'en', 'he'];

export function mergePreviewPatch(data, patch) {
  if (!data || !patch) {
    return data;
  }

  const next = {
    ...data,
    theme: { ...(data.theme || {}) },
    titles: { ...(data.titles || {}) },
  };

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
  const fontScaleKeys = ['tileTitle', 'tileDate', 'clock', 'boardHeader', 'sidebar', 'prayers', 'torahNames'];
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
    'memorialQrTitleRu', 'memorialQrTitleEn', 'memorialQrTitleHe',
    'memorialQrTextRu', 'memorialQrTextEn', 'memorialQrTextHe',
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
    if (patch.memorialQrTitleRu !== undefined) next.memorialQrPanel.titles.ru = patch.memorialQrTitleRu;
    if (patch.memorialQrTitleEn !== undefined) next.memorialQrPanel.titles.en = patch.memorialQrTitleEn;
    if (patch.memorialQrTitleHe !== undefined) next.memorialQrPanel.titles.he = patch.memorialQrTitleHe;
    if (patch.memorialQrTextRu !== undefined) next.memorialQrPanel.texts.ru = patch.memorialQrTextRu;
    if (patch.memorialQrTextEn !== undefined) next.memorialQrPanel.texts.en = patch.memorialQrTextEn;
    if (patch.memorialQrTextHe !== undefined) next.memorialQrPanel.texts.he = patch.memorialQrTextHe;
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

export function previewPatchFromSearchParams(params) {
  if (!params) {
    return null;
  }

  const hasPreview = params.get('preview') === '1'
    || params.has('primaryColor')
    || params.has('textColor')
    || params.has('accentColor')
    || params.has('tileColor')
    || params.has('tileOpacity')
    || params.has('fontScale_tileTitle')
    || params.has('titleRu')
    || params.has('titleEn')
    || params.has('titleHe')
    || params.has('previewLang')
    || params.has('memorialQrTitleRu')
    || params.has('memorialQrTextRu');

  if (!hasPreview) {
    return null;
  }

  const patch = {};
  if (params.has('titleRu')) patch.titleRu = params.get('titleRu');
  if (params.has('titleEn')) patch.titleEn = params.get('titleEn');
  if (params.has('titleHe')) patch.titleHe = params.get('titleHe');
  if (params.has('primaryColor')) patch.primaryColor = params.get('primaryColor');
  if (params.has('textColor')) patch.textColor = params.get('textColor');
  if (params.has('accentColor')) patch.accentColor = params.get('accentColor');
  if (params.has('tileColor')) patch.tileColor = params.get('tileColor');
  if (params.has('tileOpacity')) patch.tileOpacity = params.get('tileOpacity');
  ['tileTitle', 'tileDate', 'clock', 'boardHeader', 'sidebar', 'prayers', 'torahNames'].forEach((key) => {
    if (params.has(`fontScale_${key}`)) {
      patch[`fontScale_${key}`] = params.get(`fontScale_${key}`);
    }
  });
  if (params.has('previewLang')) patch.previewLang = params.get('previewLang');
  [
    'memorialQrTitleRu', 'memorialQrTitleEn', 'memorialQrTitleHe',
    'memorialQrTextRu', 'memorialQrTextEn', 'memorialQrTextHe',
    'memorialQrTitleScale', 'memorialQrTextScale', 'memorialQrQrScale',
  ].forEach((key) => {
    if (params.has(key)) {
      patch[key] = params.get(key);
    }
  });

  return patch;
}

export const BOARD_PREVIEW_MESSAGE = 'board-preview';
