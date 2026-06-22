const FONT_SCALE_DEFAULTS = {
  tileTitle: 100,
  tileDate: 100,
  clock: 100,
  boardHeader: 100,
  sidebar: 100,
  prayers: 100,
  torahNames: 100,
};

const TILE_OPACITY_DEFAULT = 100;

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function normalizeFontScales(raw) {
  const source = raw || {};
  const normalized = {};

  Object.entries(FONT_SCALE_DEFAULTS).forEach(([key, fallback]) => {
    normalized[key] = clampNumber(source[key], 50, 200, fallback);
  });

  return normalized;
}

function parseFontScalesFromBody(body) {
  const parsed = {};

  Object.keys(FONT_SCALE_DEFAULTS).forEach((key) => {
    parsed[key] = body[`fontScale_${key}`];
  });

  return normalizeFontScales(parsed);
}

function normalizeTileOpacity(value) {
  return clampNumber(value, 0, 100, TILE_OPACITY_DEFAULT);
}

function fontScaleToCss(scale) {
  return clampNumber(scale, 50, 200, 100) / 100;
}

module.exports = {
  FONT_SCALE_DEFAULTS,
  TILE_OPACITY_DEFAULT,
  normalizeFontScales,
  parseFontScalesFromBody,
  normalizeTileOpacity,
  fontScaleToCss,
};
