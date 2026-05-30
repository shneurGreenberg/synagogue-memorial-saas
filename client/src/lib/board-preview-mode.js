export function isBoardPreviewMode() {
  if (typeof window === 'undefined') {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return params.get('preview') === '1'
    || params.has('primaryColor')
    || params.has('textColor')
    || params.has('titleRu')
    || params.has('titleEn')
    || params.has('titleHe')
    || params.has('previewLang');
}

export function getPreviewLanguage() {
  if (typeof window === 'undefined') {
    return null;
  }

  const lang = new URLSearchParams(window.location.search).get('previewLang');
  return ['ru', 'en', 'he'].includes(lang) ? lang : null;
}
