const FONT_SCALE_DEFAULTS = {
  tileTitle: 100,
  tileDate: 100,
  clock: 100,
  boardHeader: 100,
  sidebar: 100,
  prayers: 100,
  prayerOverlay: 100,
  torahNames: 100,
  weather: 100,
};

const FONT_SCALE_RANGES = {
  default: { min: 50, max: 200 },
  torahNames: { min: 100, max: 400 },
};

const TILE_OPACITY_DEFAULT = 100;

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function getFontScaleRange(key) {
  return FONT_SCALE_RANGES[key] || FONT_SCALE_RANGES.default;
}

function normalizeFontScales(raw) {
  const source = raw || {};
  const normalized = {};

  Object.entries(FONT_SCALE_DEFAULTS).forEach(([key, fallback]) => {
    const range = getFontScaleRange(key);
    normalized[key] = clampNumber(source[key], range.min, range.max, fallback);
  });

  return normalized;
}

function parseFontScalesFromBody(body, existing) {
  const parsed = { ...normalizeFontScales(existing) };

  Object.keys(FONT_SCALE_DEFAULTS).forEach((key) => {
    const fieldName = `fontScale_${key}`;
    if (body && Object.prototype.hasOwnProperty.call(body, fieldName)) {
      parsed[key] = body[fieldName];
    }
  });

  return normalizeFontScales(parsed);
}

function normalizeTileOpacity(value) {
  return clampNumber(value, 0, 100, TILE_OPACITY_DEFAULT);
}

function fontScaleToCss(scale, key) {
  const range = getFontScaleRange(key);
  return clampNumber(scale, range.min, range.max, 100) / 100;
}

module.exports = {
  FONT_SCALE_DEFAULTS,
  FONT_SCALE_RANGES,
  TILE_OPACITY_DEFAULT,
  getFontScaleRange,
  normalizeFontScales,
  parseFontScalesFromBody,
  normalizeTileOpacity,
  fontScaleToCss,
};
