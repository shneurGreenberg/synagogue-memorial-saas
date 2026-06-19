const path = require('path');
const { normalizePhotoCrop } = require('./photo-crop');

const LIST_THUMB_WIDTH = 128;

function buildPhotoUrl(filename) {
  if (!filename) {
    return '';
  }

  return `/photos/${encodeURIComponent(path.basename(filename))}`;
}

function buildPhotoThumbUrl(filename, crop, width = LIST_THUMB_WIDTH) {
  if (!filename) {
    return '';
  }

  const { x, y, zoom } = normalizePhotoCrop(crop);
  const params = new URLSearchParams({
    w: String(Math.round(width)),
    cx: String(x),
    cy: String(y),
    cz: String(zoom),
  });

  return `${buildPhotoUrl(filename)}?${params.toString()}`;
}

module.exports = {
  LIST_THUMB_WIDTH,
  buildPhotoUrl,
  buildPhotoThumbUrl,
};
