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
    || params.has('titleHe');
}
