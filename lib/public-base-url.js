const DEFAULT_PUBLIC_BASE_URL = 'https://synagogue-kadish-waw-shneur.waw0.amvera.tech';

function resolvePublicBaseUrl(env = process.env) {
  const raw = String(env.PUBLIC_BASE_URL || '').trim();
  if (raw) {
    return raw.replace(/\/+$/, '');
  }
  return DEFAULT_PUBLIC_BASE_URL;
}

function communityPublicPath(slug, subPath = '', env = process.env) {
  const base = resolvePublicBaseUrl(env);
  const pathPart = String(subPath || '').replace(/^\/+/, '');
  return pathPart ? `${base}/s/${slug}/${pathPart}` : `${base}/s/${slug}`;
}

module.exports = {
  DEFAULT_PUBLIC_BASE_URL,
  resolvePublicBaseUrl,
  communityPublicPath,
};
