const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { IMAGES_DIR } = require('./storage-paths');
const { optimizeImageBuffer } = require('./image-optimize');

const MAX_SAVED_VIEW_PREVIEW_BYTES = 2 * 1024 * 1024;
const DATA_URL_RE = /^data:image\/(jpeg|jpg|webp|png);base64,(.+)$/i;

const SAVED_VIEWS_DIR = path.join(IMAGES_DIR, 'saved-views');

function ensureSavedViewsDir() {
  if (!fs.existsSync(SAVED_VIEWS_DIR)) {
    fs.mkdirSync(SAVED_VIEWS_DIR, { recursive: true });
  }
}

function parsePreviewDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return null;
  }

  const match = dataUrl.match(DATA_URL_RE);
  if (!match) {
    return null;
  }

  let buffer;
  try {
    buffer = Buffer.from(match[2], 'base64');
  } catch (err) {
    return null;
  }

  if (!buffer.length || buffer.length > MAX_SAVED_VIEW_PREVIEW_BYTES) {
    return null;
  }

  return { buffer, mime: match[1].toLowerCase() };
}

async function saveSavedViewPreviewFromDataUrl(dataUrl) {
  const parsed = parsePreviewDataUrl(dataUrl);
  if (!parsed) {
    return { ok: false, error: 'invalid_image' };
  }

  ensureSavedViewsDir();
  const optimized = await optimizeImageBuffer(parsed.buffer, 'photo');
  const ext = optimized ? optimized.ext : (parsed.mime === 'png' ? '.png' : '.jpg');
  const filename = `view-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
  const filePath = path.join(SAVED_VIEWS_DIR, filename);
  fs.writeFileSync(filePath, optimized ? optimized.buffer : parsed.buffer);

  return {
    ok: true,
    screenshot: `saved-views/${filename}`,
  };
}

module.exports = {
  MAX_SAVED_VIEW_PREVIEW_BYTES,
  parsePreviewDataUrl,
  saveSavedViewPreviewFromDataUrl,
};
