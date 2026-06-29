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

export function photoUrl(filename, options = {}) {
  if (!filename) return '';

  const width = options.width ? Number(options.width) : 0;
  const base = assetUrl(`photos/${filename}`);

  if (!width || Number.isNaN(width)) {
    return base;
  }

  if (isStaticSite()) {
    return base;
  }

  const params = new URLSearchParams();
  params.set('w', String(Math.round(width)));

  const crop = options.crop;
  if (crop && typeof crop === 'object') {
    const x = Number(crop.x);
    const y = Number(crop.y);
    const zoom = Number(crop.zoom);

    if (Number.isFinite(x)) {
      params.set('cx', String(x));
    }
    if (Number.isFinite(y)) {
      params.set('cy', String(y));
    }
    if (Number.isFinite(zoom) && zoom !== 1) {
      params.set('cz', String(zoom));
    }
  }

  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}${params.toString()}`;
}

export function isStaticSite() {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STATIC_SITE === 'true') {
    return true;
  }
  return typeof window !== 'undefined' && Boolean(window.__STATIC_SITE__);
}
