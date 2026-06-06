/** Base path for GitHub Pages project sites (e.g. /synagogue-memorial-saas/). */
export function siteBasePath() {
  if (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) {
    return import.meta.env.BASE_URL;
  }
  return '/';
}

export function assetUrl(relativePath) {
  if (!relativePath) return siteBasePath();
  const clean = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  return `${siteBasePath()}${clean}`;
}

export function photoUrl(filename) {
  if (!filename) return '';
  return assetUrl(`photos/${filename}`);
}

export function isStaticSite() {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STATIC_SITE === 'true') {
    return true;
  }
  return typeof window !== 'undefined' && Boolean(window.__STATIC_SITE__);
}
