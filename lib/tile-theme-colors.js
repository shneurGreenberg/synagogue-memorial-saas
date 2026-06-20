const DEFAULT_TILE = { r: 184, g: 154, b: 34 };
const DEFAULT_PRIMARY = { r: 207, g: 175, b: 31 };

function parseHex(hex, fallback = DEFAULT_TILE) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || '').trim());

  if (!match) {
    return { ...fallback };
  }

  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

function rgba(rgb, alpha) {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function mixRgb(rgb, target, ratio) {
  return {
    r: Math.round(rgb.r + ((target.r - rgb.r) * ratio)),
    g: Math.round(rgb.g + ((target.g - rgb.g) * ratio)),
    b: Math.round(rgb.b + ((target.b - rgb.b) * ratio)),
  };
}

function buildTileThemeVars(tileHex, primaryHex, tileOpacity = 100) {
  const tile = parseHex(tileHex, DEFAULT_TILE);
  const primary = parseHex(primaryHex, DEFAULT_PRIMARY);
  const opacity = Math.min(100, Math.max(0, Number(tileOpacity) || 100)) / 100;
  const tileDark = mixRgb(tile, { r: 0, g: 0, b: 0 }, 0.28);
  const tileLight = mixRgb(tile, { r: 255, g: 255, b: 255 }, 0.12);
  const primaryButton = mixRgb(primary, { r: 0, g: 0, b: 0 }, 0.15);
  const primaryButtonBorder = mixRgb(primary, { r: 0, g: 0, b: 0 }, 0.3);

  return {
    tileColor: tileHex || '#b89a22',
    tileOpacity: opacity,
    tileGlassBase: rgba(tile, 0.1 * opacity),
    tileGlassMid: rgba(tile, 0.18 * opacity),
    tileGlassFade: rgba(tile, 0.08 * opacity),
    tileGlassFrost: `rgba(255, 255, 255, ${0.06 * opacity})`,
    tileGlassBorder: rgba(tileDark, 0.5 * opacity + 0.25),
    tileGlassHighlight: `rgba(255, 255, 255, ${0.1 * opacity})`,
    tileGlassGlow: rgba(tile, 0.22 * opacity),
    tileGlassLegacyGlow: rgba(tile, 0.3 * opacity),
    tileGlassLegacyBase: rgba(tile, 0.3 * opacity),
    tileGlassLegacyMid: rgba(tile, 0.34 * opacity),
    tileGlassLegacyFade: rgba(tile, 0.24 * opacity),
    tileGlassLegacyFrost: `rgba(255, 255, 255, ${0.16 * opacity})`,
    tileGlassLegacyHighlight: `rgba(255, 255, 255, ${0.12 * opacity})`,
    tileSurfaceLight: rgba(tileLight, 0.62 * opacity),
    tileSurfaceDark: rgba(tileDark, 0.7 * opacity),
    tileSurfaceBorder: rgba(mixRgb(tile, { r: 0, g: 0, b: 0 }, 0.42), 0.78 * opacity + 0.1),
    cardButton: rgba(primaryButton, 0.92),
    cardButtonBorder: rgba(primaryButtonBorder, 0.95),
  };
}

module.exports = {
  buildTileThemeVars,
  parseHex,
  rgba,
};
