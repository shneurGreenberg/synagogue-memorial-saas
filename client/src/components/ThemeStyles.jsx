import React from 'react';
import { useBoardData } from '../context/BoardDataContext';
import { assetUrl } from '../lib/asset-url';
import { buildTileThemeVars } from '../lib/tile-theme-colors';
import { resolveFontScales, resolveTileOpacity } from '../lib/theme-typography';
import { effectiveFontScaleCss, resolveFontScaleBaselines } from '../lib/typography-baseline';

function tileGlassNoise(transparency) {
  if (transparency <= 0.01) {
    return 'none';
  }

  const noiseAlpha = 0.04 * transparency;

  return `repeating-linear-gradient(
    0deg,
    rgba(255, 255, 255, ${noiseAlpha}) 0,
    rgba(255, 255, 255, ${noiseAlpha}) 1px,
    transparent 1px,
    transparent 3px
  )`;
}

function tileGlassLayers(mid, fade, frost, transparency) {
  const noise = tileGlassNoise(transparency);
  const layers = `
    linear-gradient(
      80deg,
      rgba(0, 0, 0, 1) 0%,
      rgba(0, 0, 0, 1) 24%,
      rgba(0, 0, 0, 1) 32%,
      ${mid} 52%,
      ${fade} 78%,
      ${frost} 100%
    )`;

  return noise === 'none' ? layers : `${layers},\n    ${noise}`;
}

const GLASS_SELECTORS = `
  .main-container .cards-grid .card,
  .main-container .cards-grid-kadish .card,
  .golden-panel
`;

export function ThemeStyles() {
  const { data, revision } = useBoardData();
  const theme = data.theme || {};
  const primary = theme.primaryColor || '#cfaf1f';
  const text = theme.textColor || '#bfbfbf';
  const accent = theme.accentColor || '#ffd54f';
  const fontScales = resolveFontScales(theme.fontScales);
  const fontScaleBaselines = resolveFontScaleBaselines(theme.fontScaleBaselines);
  const scale = (key) => effectiveFontScaleCss(fontScales, fontScaleBaselines, key);
  const tileVars = buildTileThemeVars(theme.tileColor, primary, resolveTileOpacity(theme.tileOpacity));
  const tileTransparency = tileVars.tileTransparency;
  const useBackdropBlur = tileTransparency > 0.01;

  const css = `
    :root {
      --primary-color: ${primary};
      --text-color: ${text};
      --accent-color: ${accent};
      --tile-color: ${tileVars.tileColor};
      --tile-title-color: ${primary};
      --tile-date-color: ${text};
      --tile-glass-base: ${tileVars.tileGlassBase};
      --tile-glass-mid: ${tileVars.tileGlassMid};
      --tile-glass-fade: ${tileVars.tileGlassFade};
      --tile-glass-frost: ${tileVars.tileGlassFrost};
      --tile-glass-border: ${tileVars.tileGlassBorder};
      --tile-glass-highlight: ${tileVars.tileGlassHighlight};
      --tile-glass-glow: ${tileVars.tileGlassGlow};
      --tile-glass-legacy-glow: ${tileVars.tileGlassLegacyGlow};
      --tile-glass-legacy-base: ${tileVars.tileGlassLegacyBase};
      --tile-glass-legacy-mid: ${tileVars.tileGlassLegacyMid};
      --tile-glass-legacy-fade: ${tileVars.tileGlassLegacyFade};
      --tile-glass-legacy-frost: ${tileVars.tileGlassLegacyFrost};
      --tile-glass-legacy-highlight: ${tileVars.tileGlassLegacyHighlight};
      --tile-surface-light: ${tileVars.tileSurfaceLight};
      --tile-surface-dark: ${tileVars.tileSurfaceDark};
      --tile-surface-border: ${tileVars.tileSurfaceBorder};
      --card-button: ${tileVars.cardButton};
      --card-button-border: ${tileVars.cardButtonBorder};
      --card-button-text: #1a1a1a;
      --font-scale-tile-title: ${scale('tileTitle')};
      --font-scale-tile-date: ${scale('tileDate')};
      --font-scale-clock: ${scale('clock')};
      --font-scale-board-header: ${scale('boardHeader')};
      --font-scale-sidebar: ${scale('sidebar')};
      --font-scale-prayers: ${scale('prayers')};
      --font-scale-prayer-overlay: ${scale('prayerOverlay')};
      --font-scale-torah-names: ${scale('torahNames')};
      --font-scale-weather: ${scale('weather')};
      --font-scale-shabbat: ${scale('shabbat')};
    }
    .main-container .board-header h1 {
      color: var(--primary-color) !important;
      font-size: calc(clamp(28px, 3.8vw, 58px) * var(--font-scale-board-header)) !important;
    }
    .main-container .cards-grid .card .inner h3,
    .main-container .cards-grid-kadish .card .inner h3 {
      color: var(--tile-title-color) !important;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.55);
      font-size: calc(clamp(13px, 1.1vw, 17px) * var(--font-scale-tile-title)) !important;
    }
    .main-container .cards-grid .card.big .inner h3,
    .main-container .cards-grid-kadish .card.big .inner h3,
    .main-container .cards-grid-kadish .kadish-center .card .inner h3 {
      font-size: calc(clamp(16px, 1.5vw, 26px) * var(--font-scale-tile-title)) !important;
    }
    .main-container .cards-grid .card .inner time,
    .main-container .cards-grid-kadish .card .inner time,
    .main-container .nearest-dates,
    .main-container .nearest-dates h2,
    .main-container .nearest-dates .name,
    .main-container .nearest-dates time,
    .main-container .daily-cite {
      color: var(--tile-date-color) !important;
      font-size: calc(1em * var(--font-scale-tile-date)) !important;
    }
    .main-container .cards-grid .card .inner time,
    .main-container .cards-grid-kadish .card .inner time {
      font-size: calc(clamp(12px, 1vw, 15px) * var(--font-scale-tile-date)) !important;
    }
    .main-container .board-clock-block h1 {
      font-size: calc(clamp(24px, 2.5vw, 40px) * var(--font-scale-clock)) !important;
    }
    .main-container .board-clock-block h2 {
      font-size: calc(clamp(17px, 1.75vw, 24px) * var(--font-scale-clock)) !important;
    }
    .main-container .board-clock-block h3 {
      font-size: calc(clamp(13px, 1.15vw, 16px) * var(--font-scale-clock)) !important;
    }
    .main-container .board-clock-block,
    .main-container .board-clock-block h1,
    .main-container .board-clock-block h2,
    .main-container .board-clock-block h3,
    .main-container .board-clock-block time {
      color: #ffffff !important;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.55);
    }
    .main-container .jewish-sidebar-panels h2,
    .main-container .hayom-yom-panel h2,
    .main-container .daily-gates-panel h2,
    .main-container .nearest-dates h2 {
      font-size: calc(clamp(15px, 1.35vw, 22px) * var(--font-scale-sidebar)) !important;
    }
    .main-container .daily-cite {
      font-size: calc(clamp(14px, 1.35vw, 20px) * var(--font-scale-sidebar)) !important;
    }
    .main-container .daily-gate-tile {
      font-size: calc(clamp(11px, 0.95vw, 14px) * var(--font-scale-sidebar)) !important;
    }
    .main-container .daily-gate-label {
      font-size: calc(clamp(10px, 0.85vw, 12px) * var(--font-scale-sidebar)) !important;
    }
    .main-container .daily-gate-sublabel {
      font-size: calc(clamp(9px, 0.8vw, 11px) * var(--font-scale-sidebar)) !important;
    }
    .main-container .daily-gate-value {
      font-size: calc(clamp(11px, 0.95vw, 14px) * var(--font-scale-sidebar)) !important;
    }
    .main-container .hayom-yom-text,
    .main-container .hayom-yom-note {
      font-size: calc(clamp(11px, 0.95vw, 14px) * var(--font-scale-sidebar)) !important;
    }
    .main-container .nearest-dates .nearest-date-link time,
    .main-container .sidebar-holiday-link time,
    .main-container .sidebar-chabad-link time,
    .main-container .community-event-link time {
      font-size: calc(clamp(13px, 1.1vw, 17px) * var(--font-scale-sidebar)) !important;
    }
    .main-container .nearest-dates .nearest-date-link .name,
    .main-container .sidebar-holiday-title,
    .main-container .sidebar-chabad-title,
    .main-container .community-event-title {
      font-size: calc(clamp(14px, 1.2vw, 18px) * var(--font-scale-sidebar)) !important;
    }
    .main-container .community-event-text {
      font-size: calc(clamp(12px, 1vw, 15px) * var(--font-scale-sidebar)) !important;
    }
    .main-container .weather-panel .weather-today-temp,
    .main-container .weather-panel .weather-today-label,
    .main-container .weather-panel .weather-sun-stack,
    .main-container .weather-panel .weather-cube-date,
    .main-container .weather-panel .weather-cube-temps,
    .main-container .weather-panel .weather-loading,
    .main-container .weather-panel .weather-unavailable,
    .main-container .weather-panel h2 {
      font-size: calc(1em * var(--font-scale-weather)) !important;
    }
    .main-container .weather-panel .weather-today-temp {
      font-size: calc(clamp(24px, 2.2vw, 34px) * var(--font-scale-weather)) !important;
    }
    .main-container .weather-panel .weather-today-label {
      font-size: calc(clamp(10px, 0.88vw, 13px) * var(--font-scale-weather)) !important;
    }
    .main-container .weather-panel .weather-sun-stack {
      font-size: calc(clamp(9px, 0.78vw, 11px) * var(--font-scale-weather)) !important;
    }
    .main-container .weather-panel .weather-cube-date {
      font-size: calc(clamp(9px, 0.75vw, 11px) * var(--font-scale-weather)) !important;
    }
    .main-container .weather-panel .weather-cube-temps {
      font-size: calc(clamp(9px, 0.78vw, 11px) * var(--font-scale-weather)) !important;
    }
    .main-container .memorial-prayers-section-title,
    .main-container .memorial-prayers-inner > h2 {
      font-size: calc(clamp(16px, 1.55vw, 22px) * var(--font-scale-prayers)) !important;
    }
    .main-container .memorial-prayers .memorial-prayer-block h1 {
      font-size: calc(clamp(18px, 1.7vw, 24px) * var(--font-scale-prayers)) !important;
    }
    .main-container .memorial-prayers .prayer-text {
      font-size: calc(clamp(12px, 1.05vw, 16px) * var(--font-scale-prayers)) !important;
    }
    .main-container .memorial-prayers.memorial-prayers-big .prayer-text {
      font-size: calc(clamp(13px, 1.12vw, 17px) * var(--font-scale-prayers)) !important;
    }
    .torah-reading-name {
      font-size: calc(var(--torah-name-size, clamp(2rem, 8vw, 6.5rem)) * var(--font-scale-torah-names, 1)) !important;
    }
    .main-container .board-shabbat-block .shabbat-times .shabbat-label,
    .main-container .board-shabbat-block .shabbat-times .shabbat-time,
    .main-container .board-shabbat-block .shabbat-times .shabbat-parsha-heading,
    .main-container .board-shabbat-block .shabbat-times .shabbat-parsha-name {
      color: var(--accent-color) !important;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
    }
    .main-container .board-shabbat-block .shabbat-times .shabbat-parsha-heading {
      font-size: calc(clamp(11px, 0.95vw, 14px) * var(--font-scale-shabbat)) !important;
    }
    .main-container .board-shabbat-block .shabbat-times .shabbat-parsha-name {
      font-size: calc(clamp(17px, 1.55vw, 24px) * var(--font-scale-shabbat)) !important;
    }
    .main-container .board-shabbat-block .shabbat-times .shabbat-label {
      font-size: calc(clamp(10px, 0.88vw, 12px) * var(--font-scale-shabbat)) !important;
    }
    .main-container .board-shabbat-block .shabbat-times .shabbat-time {
      font-size: calc(clamp(14px, 1.25vw, 18px) * var(--font-scale-shabbat)) !important;
    }
    body,
    .main-container {
      color: var(--text-color) !important;
      ${theme.backgroundImage ? `background-image: url('${assetUrl(`images/${theme.backgroundImage}`)}') !important;
      background-size: cover;
      background-position: center;
      background-attachment: fixed;` : ''}
    }
    .main-container .left .wooden-panel,
    .main-container .middle .wooden-panel,
    .main-container .right .wooden-panel,
    .card-view.wooden-panel {
      ${theme.tilesBackground ? `background-image: url('${assetUrl(`images/${theme.tilesBackground}`)}') !important;
      background-size: cover;` : ''}
    }
    ${GLASS_SELECTORS} {
      background-color: var(--tile-glass-legacy-base) !important;
      background-image: ${tileGlassLayers(
        'var(--tile-glass-legacy-mid)',
        'var(--tile-glass-legacy-fade)',
        'var(--tile-glass-legacy-frost)',
        tileTransparency,
      )} !important;
      border-color: var(--tile-glass-border) !important;
      box-shadow:
        inset 0 1px 0 var(--tile-glass-legacy-highlight),
        inset 0 0 22px var(--tile-glass-legacy-glow),
        inset 0 -10px 18px rgba(0, 0, 0, 0.08) !important;
    }
    ${useBackdropBlur ? `@supports ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {
      ${GLASS_SELECTORS} {
        background-color: var(--tile-glass-base) !important;
        background-image: ${tileGlassLayers(
          'var(--tile-glass-mid)',
          'var(--tile-glass-fade)',
          'var(--tile-glass-frost)',
          tileTransparency,
        )} !important;
        box-shadow:
          inset 0 1px 0 var(--tile-glass-highlight),
          inset 0 0 30px var(--tile-glass-glow) !important;
        -webkit-backdrop-filter: blur(20px);
        backdrop-filter: blur(20px);
      }
    }` : ''}
  `;

  return (
    <style
      key={`theme-${revision}-${primary}-${text}-${accent}-${tileVars.tileColor}-${tileTransparency}`}
      dangerouslySetInnerHTML={{ __html: css }}
    />
  );
}
