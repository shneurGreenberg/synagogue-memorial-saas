const DEFAULT_PHOTO_CROP = { x: 50, y: 50, zoom: 1 };

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function normalizePhotoCrop(crop) {
  if (!crop || typeof crop !== 'object') {
    return { ...DEFAULT_PHOTO_CROP };
  }

  return {
    x: clampNumber(crop.x, 0, 100, DEFAULT_PHOTO_CROP.x),
    y: clampNumber(crop.y, 0, 100, DEFAULT_PHOTO_CROP.y),
    zoom: clampNumber(crop.zoom, 1, 3, DEFAULT_PHOTO_CROP.zoom),
  };
}

function parsePhotoCropFromBody(body) {
  return normalizePhotoCrop({
    x: body && body.photoCropX,
    y: body && body.photoCropY,
    zoom: body && body.photoCropZoom,
  });
}

function photoCropToInlineStyle(crop) {
  const { x, y, zoom } = normalizePhotoCrop(crop);
  const transform = zoom !== 1 ? `transform:scale(${zoom});` : '';
  return `object-fit:cover;object-position:${x}% ${y}%;${transform}transform-origin:${x}% ${y}%;`;
}

module.exports = {
  DEFAULT_PHOTO_CROP,
  normalizePhotoCrop,
  parsePhotoCropFromBody,
  photoCropToInlineStyle,
};
