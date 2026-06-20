import React from 'react';
import { useBoardData } from '../context/BoardDataContext';
import { assetUrl } from '../lib/asset-url';
import { buildTileThemeVars } from '../lib/tile-theme-colors';
import { fontScaleCss, resolveFontScales, resolveTileOpacity } from '../lib/theme-typography';

const TILE_GLASS_NOISE = `repeating-linear-gradient(
  0deg,
  rgba(255, 255, 255, 0.04) 0,
  rgba(255, 255, 255, 0.04) 1px,
  transparent 1px,
  transparent 3px
)`;

function tileGlassLayers(mid, fade, frost) {
  return `
    linear-gradient(
      80deg,
      rgba(0, 0, 0, 1) 0%,
      rgba(0, 0, 0, 1) 24%,
      rgba(0, 0, 0, 1) 32%,
      ${mid} 52%,
      ${fade} 78%,
      ${frost} 100%
    ),
    ${TILE_GLASS_NOISE}
  `;
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
  const tileVars = buildTileThemeVars(theme.tileColor, primary, resolveTileOpacity(theme.tileOpacity));

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
      --font-scale-tile-title: ${fontScaleCss(fontScales.tileTitle)};
      --font-scale-tile-date: ${fontScaleCss(fontScales.tileDate)};
      --font-scale-clock: ${fontScaleCss(fontScales.clock)};
      --font-scale-board-header: ${fontScaleCss(fontScales.boardHeader)};
      --font-scale-sidebar: ${fontScaleCss(fontScales.sidebar)};
      --font-scale-prayers: ${fontScaleCss(fontScales.prayers)};
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
    .main-container .sidebar-upcoming-panel h2,
    .main-container .weather-panel h2 {
      font-size: calc(1em * var(--font-scale-sidebar)) !important;
    }
    .main-container .jewish-sidebar-panels,
    .main-container .hayom-yom-panel,
    .main-container .daily-gates-panel,
    .main-container .sidebar-upcoming-panel {
      font-size: calc(1em * var(--font-scale-sidebar)) !important;
    }
    .main-container .memorial-prayers h1,
    .main-container .memorial-prayers h2,
    .main-container .memorial-prayers .prayer-text {
      font-size: calc(1em * var(--font-scale-prayers)) !important;
    }
    .main-container .board-shabbat-block .shabbat-times .shabbat-label,
    .main-container .board-shabbat-block .shabbat-times .shabbat-time,
    .main-container .board-shabbat-block .shabbat-times .shabbat-parsha-heading,
    .main-container .board-shabbat-block .shabbat-times .shabbat-parsha-name {
      color: var(--accent-color) !important;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
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
      )} !important;
      border-color: var(--tile-glass-border) !important;
      box-shadow:
        inset 0 1px 0 var(--tile-glass-legacy-highlight),
        inset 0 0 22px var(--tile-glass-legacy-glow),
        inset 0 -10px 18px rgba(0, 0, 0, 0.08) !important;
    }
    @supports ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {
      ${GLASS_SELECTORS} {
        background-color: var(--tile-glass-base) !important;
        background-image: ${tileGlassLayers(
          'var(--tile-glass-mid)',
          'var(--tile-glass-fade)',
          'var(--tile-glass-frost)',
        )} !important;
        box-shadow:
          inset 0 1px 0 var(--tile-glass-highlight),
          inset 0 0 30px var(--tile-glass-glow) !important;
        -webkit-backdrop-filter: blur(20px);
        backdrop-filter: blur(20px);
      }
    }
  `;

  return (
    <style
      key={`theme-${revision}-${primary}-${text}-${accent}-${tileVars.tileColor}-${tileVars.tileOpacity}`}
      dangerouslySetInnerHTML={{ __html: css }}
    />
  );
}
