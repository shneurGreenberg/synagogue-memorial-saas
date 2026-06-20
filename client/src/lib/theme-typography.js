export const FONT_SCALE_DEFAULTS = {
  tileTitle: 100,
  tileDate: 100,
  clock: 100,
  boardHeader: 100,
  sidebar: 100,
  prayers: 100,
};

export const TILE_OPACITY_DEFAULT = 100;

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export function resolveFontScales(raw) {
  const source = raw || {};
  const resolved = {};

  Object.entries(FONT_SCALE_DEFAULTS).forEach(([key, fallback]) => {
    resolved[key] = clampNumber(source[key], 50, 200, fallback);
  });

  return resolved;
}

export function resolveTileOpacity(raw) {
  return clampNumber(raw, 0, 100, TILE_OPACITY_DEFAULT);
}

export function fontScaleCss(scale) {
  const parsed = Number(scale);
  if (!Number.isFinite(parsed)) {
    return 1;
  }
  return clampNumber(parsed, 50, 200, 100) / 100;
}
