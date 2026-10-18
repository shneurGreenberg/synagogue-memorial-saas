/**
 * Saved views carry only board visual design (colors, typography scales, backgrounds, etc.).
 * Community content, feature toggles, QR assets, and copy never travel with a saved view.
 */

const { BOARD_THEME_DEFAULTS } = require('./board-defaults');

function sanitizeHexColor(value, fallback) {
  const candidate = String(value || '').trim();
  return /^#[0-9A-Fa-f]{6}$/.test(candidate) ? candidate : fallback;
}
const {
  normalizeFontScales,
  normalizeTileOpacity,
  normalizeLogoBorderRadius,
} = require('./theme-typography');
const { normalizeFontScaleBaselines, memorialQrPanelBaselinesToUpdate } = require('./typography-baseline');
const { normalizeCandlePalette } = require('./candle-palette');
const { normalizeBoardFont } = require('./board-fonts');
const { normalizeMemorialQrPanel } = require('./memorial-qr-panel');
const { normalizeThemeBorders } = require('./theme-borders');

const THEME_DESIGN_KEYS = new Set([
  'primaryColor',
  'textColor',
  'accentColor',
  'tileColor',
  'tileOpacity',
  'panelBorderColor',
  'panelBorderOpacity',
  'panelBorderRadius',
  'panelBorderWidth',
  'tileBorderColor',
  'tileBorderOpacity',
  'tileBorderRadius',
  'tileBorderWidth',
  'fontScales',
  'fontScaleBaselines',
  'backgroundImage',
  'tilesBackground',
  'candlePalette',
  'boardFont',
  'logoBorderRadius',
]);

const MEMORIAL_QR_DESIGN_KEYS = new Set([
  'titleScale',
  'textScale',
  'qrScale',
  'titleScaleBaseline',
  'textScaleBaseline',
  'qrScaleBaseline',
]);

function pickThemeDesign(theme) {
  const source = theme && typeof theme === 'object' ? theme : {};
  const next = {};
  THEME_DESIGN_KEYS.forEach((key) => {
    if (source[key] !== undefined) {
      next[key] = source[key];
    }
  });
  return next;
}

function pickMemorialQrDesign(panel) {
  const source = panel && typeof panel === 'object' ? panel : {};
  const next = {};
  MEMORIAL_QR_DESIGN_KEYS.forEach((key) => {
    if (source[key] !== undefined) {
      next[key] = source[key];
    }
  });
  return next;
}

function pickDesignFromSnapshot(snapshot) {
  const snap = snapshot && typeof snapshot === 'object' ? snapshot : {};
  const theme = pickThemeDesign(snap.theme);
  const memorialQrPanel = pickMemorialQrDesign(snap.memorialQrPanel);
  const result = {};
  if (Object.keys(theme).length) {
    result.theme = theme;
  }
  if (Object.keys(memorialQrPanel).length) {
    result.memorialQrPanel = memorialQrPanel;
  }
  return result;
}

function buildDesignApplyUpdate(snapshot) {
  const design = pickDesignFromSnapshot(snapshot);
  const theme = design.theme || {};
  const update = {};

  if (theme.primaryColor) {
    update['theme.primaryColor'] = sanitizeHexColor(theme.primaryColor, BOARD_THEME_DEFAULTS.primaryColor);
  }
  if (theme.textColor) {
    update['theme.textColor'] = sanitizeHexColor(theme.textColor, BOARD_THEME_DEFAULTS.textColor);
  }
  if (theme.accentColor) {
    update['theme.accentColor'] = sanitizeHexColor(theme.accentColor, BOARD_THEME_DEFAULTS.accentColor);
  }
  if (theme.tileColor) {
    update['theme.tileColor'] = sanitizeHexColor(theme.tileColor, BOARD_THEME_DEFAULTS.tileColor);
  }
  if (theme.tileOpacity != null) {
    update['theme.tileOpacity'] = normalizeTileOpacity(theme.tileOpacity);
  }

  const borderDesignKeys = [
    'panelBorderColor', 'panelBorderOpacity', 'panelBorderRadius', 'panelBorderWidth',
    'tileBorderColor', 'tileBorderOpacity', 'tileBorderRadius', 'tileBorderWidth',
  ];
  const hasBorderDesign = borderDesignKeys.some((key) => theme[key] !== undefined);
  if (hasBorderDesign) {
    const borders = normalizeThemeBorders(theme);
    update['theme.panelBorderColor'] = borders.panelBorderColor;
    update['theme.panelBorderOpacity'] = borders.panelBorderOpacity;
    update['theme.panelBorderRadius'] = borders.panelBorderRadius;
    update['theme.panelBorderWidth'] = borders.panelBorderWidth;
    update['theme.tileBorderColor'] = borders.tileBorderColor;
    update['theme.tileBorderOpacity'] = borders.tileBorderOpacity;
    update['theme.tileBorderRadius'] = borders.tileBorderRadius;
    update['theme.tileBorderWidth'] = borders.tileBorderWidth;
  }

  const fontScales = normalizeFontScales(theme.fontScales);
  Object.entries(fontScales).forEach(([key, value]) => {
    update[`theme.fontScales.${key}`] = value;
  });

  const fontScaleBaselines = normalizeFontScaleBaselines(theme.fontScaleBaselines);
  Object.entries(fontScaleBaselines).forEach(([key, value]) => {
    update[`theme.fontScaleBaselines.${key}`] = value;
  });

  if (theme.logoBorderRadius != null) {
    update['theme.logoBorderRadius'] = normalizeLogoBorderRadius(theme.logoBorderRadius);
  }
  if (theme.backgroundImage) {
    update['theme.backgroundImage'] = theme.backgroundImage;
  }
  if (theme.tilesBackground) {
    update['theme.tilesBackground'] = theme.tilesBackground;
  }
  if (theme.candlePalette) {
    update['theme.candlePalette'] = normalizeCandlePalette(theme.candlePalette);
  }
  if (theme.boardFont) {
    update['theme.boardFont'] = normalizeBoardFont(theme.boardFont);
  }

  const qrDesign = pickMemorialQrDesign(design.memorialQrPanel);
  if (Object.keys(qrDesign).length) {
    const panel = normalizeMemorialQrPanel(qrDesign);
    Object.assign(update, memorialQrPanelBaselinesToUpdate(panel));
    update['memorialQrPanel.titleScale'] = panel.titleScale;
    update['memorialQrPanel.textScale'] = panel.textScale;
    update['memorialQrPanel.qrScale'] = panel.qrScale;
  }

  return update;
}

module.exports = {
  THEME_DESIGN_KEYS,
  MEMORIAL_QR_DESIGN_KEYS,
  pickThemeDesign,
  pickMemorialQrDesign,
  pickDesignFromSnapshot,
  buildDesignApplyUpdate,
};
