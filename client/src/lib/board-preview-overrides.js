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
  if (patch.previewLang && PREVIEW_LANGS.includes(patch.previewLang)) {
    next.language = patch.previewLang;
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
    || params.has('titleRu')
    || params.has('titleEn')
    || params.has('titleHe')
    || params.has('previewLang');

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
  if (params.has('previewLang')) patch.previewLang = params.get('previewLang');

  return patch;
}

export const BOARD_PREVIEW_MESSAGE = 'board-preview';
