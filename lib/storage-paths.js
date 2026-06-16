const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function detectPersistRoot() {
  if (process.env.PERSIST_DIR) {
    return path.resolve(process.env.PERSIST_DIR);
  }

  if (fs.existsSync('/data') && fs.statSync('/data').isDirectory()) {
    return '/data';
  }

  return null;
}

const PERSIST_ROOT = detectPersistRoot();

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function resolveUploadsDir(name) {
  if (!PERSIST_ROOT) {
    return path.join(ROOT, name);
  }

  const dir = path.join(PERSIST_ROOT, name);
  ensureDir(dir);
  return dir;
}

module.exports = {
  PERSIST_ROOT,
  isPersistent: Boolean(PERSIST_ROOT),
  BUNDLED_IMAGES_DIR: path.join(ROOT, 'images'),
  BUNDLED_PHOTOS_DIR: path.join(ROOT, 'photos'),
  IMAGES_DIR: resolveUploadsDir('images'),
  PHOTOS_DIR: resolveUploadsDir('photos'),
  PHOTO_CACHE_DIR: PERSIST_ROOT
    ? path.join(PERSIST_ROOT, '.photo-cache')
    : path.join(ROOT, '.photo-cache'),
};
