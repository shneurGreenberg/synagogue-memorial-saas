const fs = require('fs');
const path = require('path');
const { OFFICIAL_LOGO_FILENAME } = require('./board-defaults');
const { normalizeBoardFeatures } = require('./board-features');
const { BUNDLED_IMAGES_DIR, IMAGES_DIR } = require('./storage-paths');

let sharp;

function getSharp() {
  if (sharp !== undefined) {
    return sharp;
  }

  try {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    sharp = require('sharp');
  } catch (err) {
    sharp = null;
  }

  return sharp;
}

function resolveLogoPath(logoFilename) {
  const filename = String(logoFilename || 'banner-transparent.png').trim() || 'banner-transparent.png';
  const candidates = [
    path.join(IMAGES_DIR, filename),
    path.join(BUNDLED_IMAGES_DIR, filename),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

const FAVICON_CACHE = new Map();

function faviconCacheKey(logoPath, badge) {
  let mtime = 0;
  try {
    mtime = fs.statSync(logoPath).mtimeMs;
  } catch (_) {
    return '';
  }
  return `${logoPath}:${mtime}:${badge ? 1 : 0}`;
}

async function renderFaviconPng(logoFilename, { badge = false } = {}) {
  const sharp = getSharp();
  const logoPath = resolveLogoPath(logoFilename);

  if (!sharp || !logoPath) {
    return null;
  }

  const cacheKey = faviconCacheKey(logoPath, badge);
  if (cacheKey && FAVICON_CACHE.has(cacheKey)) {
    return FAVICON_CACHE.get(cacheKey);
  }

  let image = sharp(logoPath)
    .resize(64, 64, {
      fit: 'contain',
      background: { r: 24, g: 24, b: 24, alpha: 1 },
    })
    .png();

  if (badge) {
    const badgeSvg = Buffer.from(
      '<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">'
      + '<circle cx="50" cy="14" r="10" fill="#e53935" stroke="#fff" stroke-width="2"/>'
      + '</svg>',
    );
    image = sharp(await image.toBuffer())
      .composite([{ input: badgeSvg, top: 0, left: 0 }])
      .png();
  }

  const buffer = await image.toBuffer();
  if (cacheKey) {
    FAVICON_CACHE.set(cacheKey, buffer);
  }
  return buffer;
}

function resolveFaviconLogoFilename(synagogue) {
  const features = normalizeBoardFeatures(synagogue && synagogue.boardFeatures);
  if (features.officialLogo !== false) {
    return OFFICIAL_LOGO_FILENAME;
  }

  return (synagogue && synagogue.theme && synagogue.theme.logo) || 'banner-transparent.png';
}

function buildFaviconPath(slug, { badge = false } = {}) {
  const suffix = badge ? '-alert' : '';
  return `/s/${slug}/favicon${suffix}.png`;
}

module.exports = {
  resolveLogoPath,
  resolveFaviconLogoFilename,
  renderFaviconPng,
  buildFaviconPath,
};
