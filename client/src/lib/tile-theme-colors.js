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

function blendAlpha(glassAlpha, opaqueAlpha, solid) {
  return solid * opaqueAlpha + (1 - solid) * glassAlpha;
}

export function buildTileThemeVars(tileHex, primaryHex, tileOpacity = 100) {
  const tile = parseHex(tileHex, DEFAULT_TILE);
  const primary = parseHex(primaryHex, DEFAULT_PRIMARY);
  const transparency = Math.min(100, Math.max(0, Number(tileOpacity) ?? 100)) / 100;
  const solid = 1 - transparency;
  const alpha = (glassAlpha, opaqueAlpha = 1) => blendAlpha(glassAlpha, opaqueAlpha, solid);
  const tileDark = mixRgb(tile, { r: 0, g: 0, b: 0 }, 0.28);
  const tileLight = mixRgb(tile, { r: 255, g: 255, b: 255 }, 0.12);
  const primaryButton = mixRgb(primary, { r: 0, g: 0, b: 0 }, 0.15);
  const primaryButtonBorder = mixRgb(primary, { r: 0, g: 0, b: 0 }, 0.3);

  return {
    tileColor: tileHex || '#b89a22',
    tileTransparency: transparency,
    tileGlassBase: rgba(tile, alpha(0.1)),
    tileGlassMid: rgba(tile, alpha(0.18)),
    tileGlassFade: rgba(tile, alpha(0.08)),
    tileGlassFrost: `rgba(255, 255, 255, ${alpha(0.06)})`,
    tileGlassBorder: rgba(tileDark, alpha(0.75, 0.92)),
    tileGlassHighlight: `rgba(255, 255, 255, ${alpha(0.1, 0.08)})`,
    tileGlassGlow: rgba(tile, alpha(0.22, 0)),
    tileGlassLegacyGlow: rgba(tile, alpha(0.3, 0)),
    tileGlassLegacyBase: rgba(tile, alpha(0.3)),
    tileGlassLegacyMid: rgba(tile, alpha(0.34)),
    tileGlassLegacyFade: rgba(tile, alpha(0.24)),
    tileGlassLegacyFrost: `rgba(255, 255, 255, ${alpha(0.16)})`,
    tileGlassLegacyHighlight: `rgba(255, 255, 255, ${alpha(0.12, 0.08)})`,
    tileSurfaceLight: rgba(tileLight, alpha(0.62, 0.88)),
    tileSurfaceDark: rgba(tileDark, alpha(0.7, 0.9)),
    tileSurfaceBorder: rgba(mixRgb(tile, { r: 0, g: 0, b: 0 }, 0.42), alpha(0.88, 0.95)),
    cardButton: rgba(primaryButton, 0.92),
    cardButtonBorder: rgba(primaryButtonBorder, 0.95),
  };
}
