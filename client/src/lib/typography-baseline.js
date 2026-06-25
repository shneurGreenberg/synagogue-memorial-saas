import { FONT_SCALE_DEFAULTS, resolveFontScales, getFontScaleRange } from './theme-typography';

function clampPercent(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export function resolveFontScaleBaselines(raw) {
  const source = raw || {};
  const resolved = {};

  Object.entries(FONT_SCALE_DEFAULTS).forEach(([key, fallback]) => {
    resolved[key] = clampPercent(source[key], 50, 400, fallback);
  });

  return resolved;
}

export function effectiveFontScaleCss(scales, baselines, key) {
  const scale = resolveFontScales(scales)[key];
  const baseline = resolveFontScaleBaselines(baselines)[key];
  const range = getFontScaleRange(key);
  const effective = (baseline * scale) / 100;
  return clampPercent(effective, range.min, 400, 100) / 100;
}

export function effectiveMemorialQrScale(panel, key) {
  const scale = Number(panel?.[key]) || 100;
  const baseline = Number(panel?.[`${key}Baseline`]) || 100;
  return (baseline / 100) * (scale / 100);
}
