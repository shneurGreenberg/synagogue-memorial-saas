'use strict';

const DEFAULT_FRAME_ANCESTORS = [
  'https://jewish-community-web-shneur.amvera.io',
  'https://jewishsib-shneur.mia0.amvera.tech',
  'https://www.jewishsib.ru',
  'https://jewishsib.ru',
];

function parseFrameAncestors(value) {
  const raw = value === undefined || value === null ? '' : String(value).trim();
  const list = raw
    ? raw.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean)
    : DEFAULT_FRAME_ANCESTORS.slice();
  const withoutSelf = list.filter((item) => item !== "'self'" && item !== 'self');
  return ["'self'", ...new Set(withoutSelf)];
}

// Public board pages (/s/*) may be embedded by trusted community sites;
// everything else (admin, master, login, staff scan) stays SAMEORIGIN.
function isEmbeddablePath(pathname) {
  const p = String(pathname || '');
  if (!(p === '/s' || p.startsWith('/s/'))) {
    return false;
  }
  // /s/:slug/scan (staff gravestone scan) keeps clickjacking protection.
  if (/^\/s\/[^/]+\/scan(\/|$)/.test(p)) {
    return false;
  }
  return true;
}

function mergeFrameAncestors(existingCsp, ancestors) {
  const directive = `frame-ancestors ${ancestors.join(' ')}`;
  const parts = String(existingCsp || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !/^frame-ancestors(\s|$)/i.test(part));
  parts.push(directive);
  return parts.join('; ');
}

function createFramePolicyMiddleware(options = {}) {
  const ancestors = parseFrameAncestors(
    options.frameAncestors !== undefined ? options.frameAncestors : process.env.FRAME_ANCESTORS
  );

  return function framePolicy(req, res, next) {
    if (isEmbeddablePath(req.path)) {
      res.removeHeader('X-Frame-Options');
      res.setHeader(
        'Content-Security-Policy',
        mergeFrameAncestors(res.getHeader('Content-Security-Policy'), ancestors)
      );
    } else {
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    }
    next();
  };
}

module.exports = {
  DEFAULT_FRAME_ANCESTORS,
  parseFrameAncestors,
  isEmbeddablePath,
  mergeFrameAncestors,
  createFramePolicyMiddleware,
};
