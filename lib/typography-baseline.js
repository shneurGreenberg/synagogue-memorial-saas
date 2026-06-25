const { FONT_SCALE_DEFAULTS, normalizeFontScales, parseFontScalesFromBody } = require('./theme-typography');
const {
  MEMORIAL_QR_DEFAULTS,
  normalizeMemorialQrPanel,
  parseMemorialQrPanelFromBody,
} = require('./memorial-qr-panel');

const QR_SCALE_KEYS = ['titleScale', 'textScale', 'qrScale'];

function clampPercent(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function normalizeFontScaleBaselines(raw) {
  const source = raw || {};
  const normalized = {};

  Object.entries(FONT_SCALE_DEFAULTS).forEach(([key, fallback]) => {
    normalized[key] = clampPercent(source[key], 50, 400, fallback);
  });

  return normalized;
}

function normalizeMemorialQrBaselines(raw) {
  const source = raw || {};

  return {
    titleScaleBaseline: clampPercent(source.titleScaleBaseline, 50, 400, 100),
    textScaleBaseline: clampPercent(source.textScaleBaseline, 50, 400, 100),
    qrScaleBaseline: clampPercent(source.qrScaleBaseline, 80, 400, 100),
  };
}

function effectiveFontScalePercent(scales, baselines, key) {
  const scale = normalizeFontScales(scales)[key];
  const baseline = normalizeFontScaleBaselines(baselines)[key];
  return (baseline * scale) / 100;
}

function effectiveMemorialQrScalePercent(panel, key) {
  const normalized = normalizeMemorialQrPanel(panel);
  const baselines = normalizeMemorialQrBaselines(panel);
  const baselineKey = `${key}Baseline`;
  const baseline = baselines[baselineKey] || 100;
  return (baseline * normalized[key]) / 100;
}

function bakeFontScalesForSnapshot(currentScales, currentBaselines) {
  const scales = normalizeFontScales(currentScales);
  const baselines = normalizeFontScaleBaselines(currentBaselines);
  const bakedBaselines = {};
  const resetScales = {};

  Object.keys(FONT_SCALE_DEFAULTS).forEach((key) => {
    bakedBaselines[key] = clampPercent((baselines[key] * scales[key]) / 100, 50, 400, 100);
    resetScales[key] = 100;
  });

  return {
    fontScales: resetScales,
    fontScaleBaselines: bakedBaselines,
  };
}

function bakeMemorialQrPanelForSnapshot(currentPanel) {
  const panel = normalizeMemorialQrPanel(currentPanel);
  const baselines = normalizeMemorialQrBaselines(currentPanel);
  const baked = {
    ...panel,
    titleScale: 100,
    textScale: 100,
    qrScale: 100,
    titleScaleBaseline: clampPercent((baselines.titleScaleBaseline * panel.titleScale) / 100, 50, 400, 100),
    textScaleBaseline: clampPercent((baselines.textScaleBaseline * panel.textScale) / 100, 50, 400, 100),
    qrScaleBaseline: clampPercent((baselines.qrScaleBaseline * panel.qrScale) / 100, 80, 400, 100),
  };

  return baked;
}

function bakeTypographySnapshotFromBody(body, synagogue) {
  const theme = synagogue?.theme || {};
  const currentScales = parseFontScalesFromBody(body, theme.fontScales);
  const currentBaselines = theme.fontScaleBaselines;
  const bakedFonts = bakeFontScalesForSnapshot(currentScales, currentBaselines);
  const memorialQrPanel = bakeMemorialQrPanelForSnapshot({
    ...(synagogue?.memorialQrPanel || {}),
    titleScale: body.memorialQrTitleScale,
    textScale: body.memorialQrTextScale,
    qrScale: body.memorialQrQrScale,
  });

  return {
    fontScales: bakedFonts.fontScales,
    fontScaleBaselines: bakedFonts.fontScaleBaselines,
    memorialQrPanel,
  };
}

function memorialQrPanelBaselinesToUpdate(panel) {
  const normalized = normalizeMemorialQrPanel(panel);
  const baselines = normalizeMemorialQrBaselines(panel);

  return {
    'memorialQrPanel.titleScale': normalized.titleScale,
    'memorialQrPanel.textScale': normalized.textScale,
    'memorialQrPanel.qrScale': normalized.qrScale,
    'memorialQrPanel.titleScaleBaseline': baselines.titleScaleBaseline,
    'memorialQrPanel.textScaleBaseline': baselines.textScaleBaseline,
    'memorialQrPanel.qrScaleBaseline': baselines.qrScaleBaseline,
  };
}

module.exports = {
  QR_SCALE_KEYS,
  normalizeFontScaleBaselines,
  normalizeMemorialQrBaselines,
  effectiveFontScalePercent,
  effectiveMemorialQrScalePercent,
  bakeFontScalesForSnapshot,
  bakeMemorialQrPanelForSnapshot,
  bakeTypographySnapshotFromBody,
  memorialQrPanelBaselinesToUpdate,
};
