const { parseHex, rgba } = require('./tile-theme-colors');

function sanitizeHexColor(value, fallback) {
  const candidate = String(value || '').trim();
  return /^#[0-9A-Fa-f]{6}$/.test(candidate) ? candidate : fallback;
}

const PANEL_BORDER_DEFAULT_COLOR = '#604f2f';
const TILE_BORDER_DEFAULT_COLOR = '#60500e';

function normalizeBorderOpacity(value, fallback = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function normalizeOptionalBorderColor(value, fallback = '') {
  const candidate = String(value || '').trim();
  if (!candidate) {
    return fallback;
  }
  return /^#[0-9A-Fa-f]{6}$/.test(candidate) ? candidate : fallback;
}

function normalizeThemeBorders(theme = {}) {
  const source = theme || {};
  const tileBorderColor = normalizeOptionalBorderColor(
    source.tileBorderColor,
    TILE_BORDER_DEFAULT_COLOR,
  );

  return {
    panelBorderColor: sanitizeHexColor(source.panelBorderColor, PANEL_BORDER_DEFAULT_COLOR),
    panelBorderOpacity: normalizeBorderOpacity(source.panelBorderOpacity, 100),
    tileBorderColor,
    tileBorderOpacity: normalizeBorderOpacity(source.tileBorderOpacity, 100),
  };
}

function colorWithOpacity(hex, opacityPercent) {
  const rgb = parseHex(hex, parseHex(PANEL_BORDER_DEFAULT_COLOR));
  const alpha = normalizeBorderOpacity(opacityPercent, 100) / 100;
  return rgba(rgb, alpha);
}

function resolvePanelBorderCss(theme) {
  const borders = normalizeThemeBorders(theme);
  return colorWithOpacity(borders.panelBorderColor, borders.panelBorderOpacity);
}

function resolveTileBorderCss(theme, tileGlassBorderFallback) {
  const borders = normalizeThemeBorders(theme);
  if (!borders.tileBorderColor) {
    return tileGlassBorderFallback || colorWithOpacity(TILE_BORDER_DEFAULT_COLOR, borders.tileBorderOpacity);
  }
  return colorWithOpacity(borders.tileBorderColor, borders.tileBorderOpacity);
}

module.exports = {
  PANEL_BORDER_DEFAULT_COLOR,
  TILE_BORDER_DEFAULT_COLOR,
  normalizeBorderOpacity,
  normalizeThemeBorders,
  resolvePanelBorderCss,
  resolveTileBorderCss,
};
