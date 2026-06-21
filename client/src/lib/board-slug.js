export function getBoardSlug() {
  if (typeof window === 'undefined') {
    return '';
  }

  const parts = window.location.pathname.split('/').filter(Boolean);
  if (parts[0] === 's' && parts[1]) {
    return parts[1];
  }

  return '';
}
