const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PHOTOS_DIR = path.join(__dirname, '..', 'photos');
const CACHE_DIR = path.join(__dirname, '..', '.photo-cache');

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

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function getCachePath(filename, width) {
  const hash = crypto.createHash('sha1').update(`${filename}:${width}`).digest('hex');
  return path.join(CACHE_DIR, `${hash}.jpg`);
}

function resolvePhotoPath(filename) {
  const safeName = path.basename(filename);
  const fullPath = path.join(PHOTOS_DIR, safeName);

  if (!fullPath.startsWith(PHOTOS_DIR) || !fs.existsSync(fullPath)) {
    return null;
  }

  return fullPath;
}

async function getResizedPhoto(filename, width) {
  const sourcePath = resolvePhotoPath(filename);

  if (!sourcePath) {
    return null;
  }

  const normalizedWidth = Math.min(Math.max(Number(width) || 0, 64), 800);

  if (!normalizedWidth) {
    return sourcePath;
  }

  const sharpLib = getSharp();

  if (!sharpLib) {
    return sourcePath;
  }

  ensureCacheDir();
  const cachePath = getCachePath(path.basename(filename), normalizedWidth);

  if (fs.existsSync(cachePath)) {
    return cachePath;
  }

  await sharpLib(sourcePath)
    .rotate()
    .resize({
      width: normalizedWidth,
      withoutEnlargement: true,
      fit: 'inside',
    })
    .jpeg({
      quality: 82,
      mozjpeg: true,
    })
    .toFile(cachePath);

  return cachePath;
}

module.exports = {
  getResizedPhoto,
  resolvePhotoPath,
};
