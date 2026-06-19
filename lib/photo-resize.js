const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { normalizePhotoCrop } = require('./photo-crop');
const {
  PHOTOS_DIR,
  PHOTO_CACHE_DIR,
  BUNDLED_PHOTOS_DIR,
} = require('./storage-paths');

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
  if (!fs.existsSync(PHOTO_CACHE_DIR)) {
    fs.mkdirSync(PHOTO_CACHE_DIR, { recursive: true });
  }
}

function getCachePath(filename, width, crop) {
  const cropKey = crop
    ? `${crop.x}:${crop.y}:${crop.zoom}`
    : '';
  const hash = crypto.createHash('sha1').update(`${filename}:${width}:${cropKey}`).digest('hex');
  return path.join(PHOTO_CACHE_DIR, `${hash}.jpg`);
}

function resolvePhotoPath(filename) {
  const safeName = path.basename(filename);
  const candidates = [
    path.join(PHOTOS_DIR, safeName),
    path.join(BUNDLED_PHOTOS_DIR, safeName),
  ];

  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    const root = i === 0 ? PHOTOS_DIR : BUNDLED_PHOTOS_DIR;

    if (candidate.startsWith(root) && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function getResizedPhoto(filename, width, crop) {
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

  const normalizedCrop = crop ? normalizePhotoCrop(crop) : null;
  ensureCacheDir();
  const cachePath = getCachePath(path.basename(filename), normalizedWidth, normalizedCrop);

  if (fs.existsSync(cachePath)) {
    return cachePath;
  }

  if (normalizedCrop) {
    const meta = await sharpLib(sourcePath).rotate().metadata();
    const sourceWidth = meta.width || normalizedWidth;
    const sourceHeight = meta.height || normalizedWidth;
    const { x, y, zoom } = normalizedCrop;
    const coverScale = Math.max(
      (normalizedWidth * zoom) / sourceWidth,
      (normalizedWidth * zoom) / sourceHeight,
    );
    const scaledWidth = Math.max(normalizedWidth, Math.ceil(sourceWidth * coverScale));
    const scaledHeight = Math.max(normalizedWidth, Math.ceil(sourceHeight * coverScale));
    const centerX = scaledWidth * (x / 100);
    const centerY = scaledHeight * (y / 100);
    const left = Math.max(0, Math.min(scaledWidth - normalizedWidth, Math.round(centerX - normalizedWidth / 2)));
    const top = Math.max(0, Math.min(scaledHeight - normalizedWidth, Math.round(centerY - normalizedWidth / 2)));

    await sharpLib(sourcePath)
      .rotate()
      .resize(scaledWidth, scaledHeight, { fit: 'fill' })
      .extract({
        left,
        top,
        width: normalizedWidth,
        height: normalizedWidth,
      })
      .jpeg({
        quality: 80,
        mozjpeg: true,
      })
      .toFile(cachePath);

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
