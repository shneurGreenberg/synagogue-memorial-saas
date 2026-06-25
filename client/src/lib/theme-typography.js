export const FONT_SCALE_DEFAULTS = {
  tileTitle: 100,
  tileDate: 100,
  clock: 100,
  boardHeader: 100,
  sidebar: 100,
  prayers: 100,
  prayerOverlay: 100,
  torahNames: 100,
  weather: 100,
  shabbat: 100,
  candle: 75,
};

export const FONT_SCALE_RANGES = {
  default: { min: 50, max: 200 },
  torahNames: { min: 100, max: 400 },
  candle: { min: 40, max: 150 },
};

export const TILE_OPACITY_DEFAULT = 100;

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export function getFontScaleRange(key) {
  return FONT_SCALE_RANGES[key] || FONT_SCALE_RANGES.default;
}

export function resolveFontScales(raw) {
  const source = raw || {};
  const resolved = {};

  Object.entries(FONT_SCALE_DEFAULTS).forEach(([key, fallback]) => {
    const range = getFontScaleRange(key);
    resolved[key] = clampNumber(source[key], range.min, range.max, fallback);
  });

  return resolved;
}

export function resolveTileOpacity(raw) {
  return clampNumber(raw, 0, 100, TILE_OPACITY_DEFAULT);
}

export function fontScaleCss(scale, key) {
  const parsed = Number(scale);
  const range = getFontScaleRange(key);
  if (!Number.isFinite(parsed)) {
    return range.min / 100;
  }
  return clampNumber(parsed, range.min, range.max, 100) / 100;
}
