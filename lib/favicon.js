const fs = require('fs');
const path = require('path');
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

async function renderFaviconPng(logoFilename, { badge = false } = {}) {
  const sharp = getSharp();
  const logoPath = resolveLogoPath(logoFilename);

  if (!sharp || !logoPath) {
    return null;
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

  return image.toBuffer();
}

function buildFaviconPath(slug, { badge = false } = {}) {
  const suffix = badge ? '-alert' : '';
  return `/s/${slug}/favicon${suffix}.png`;
}

module.exports = {
  resolveLogoPath,
  renderFaviconPng,
  buildFaviconPath,
};
