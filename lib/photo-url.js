const path = require('path');

const LIST_THUMB_WIDTH = 128;

function buildPhotoUrl(filename) {
  if (!filename) {
    return '';
  }

  return `/photos/${encodeURIComponent(path.basename(filename))}`;
}

function buildPhotoThumbUrl(filename, width = LIST_THUMB_WIDTH) {
  if (!filename) {
    return '';
  }

  const params = new URLSearchParams({
    w: String(Math.round(width)),
  });

  return `${buildPhotoUrl(filename)}?${params.toString()}`;
}

module.exports = {
  LIST_THUMB_WIDTH,
  buildPhotoUrl,
  buildPhotoThumbUrl,
};
