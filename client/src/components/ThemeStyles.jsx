import React from 'react';
import { useBoardData } from '../context/BoardDataContext';
import { assetUrl } from '../lib/asset-url';
import { buildTileThemeVars } from '../lib/tile-theme-colors';

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
      rgba(0, 0, 0, 0.95) 0%,
      rgba(0, 0, 0, 0.95) 24%,
      rgba(0, 0, 0, 0.82) 32%,
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
  const tileVars = buildTileThemeVars(theme.tileColor, primary);

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
    }
    .main-container .board-header h1 {
      color: var(--primary-color) !important;
    }
    .main-container .cards-grid .card .inner h3,
    .main-container .cards-grid-kadish .card .inner h3 {
      color: var(--tile-title-color) !important;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.55);
    }
    .main-container .cards-grid .card .inner time,
    .main-container .cards-grid-kadish .card .inner time,
    .main-container .nearest-dates,
    .main-container .nearest-dates h2,
    .main-container .nearest-dates .name,
    .main-container .nearest-dates time,
    .main-container .daily-cite {
      color: var(--tile-date-color) !important;
    }
    .main-container .board-clock-block,
    .main-container .board-clock-block h1,
    .main-container .board-clock-block h2,
    .main-container .board-clock-block h3,
    .main-container .board-clock-block time {
      color: #ffffff !important;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.55);
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
        box-shadow: inset 0 1px 0 var(--tile-glass-highlight) !important;
        -webkit-backdrop-filter: blur(10px);
        backdrop-filter: blur(10px);
      }
    }
    .main-container .search input,
    .main-container .pager .pager-btn {
      background: linear-gradient(165deg, var(--tile-surface-light), var(--tile-surface-dark)) !important;
      background-color: var(--tile-surface-dark) !important;
      border-color: var(--tile-surface-border) !important;
    }
  `;

  return (
    <style
      key={`theme-${revision}-${primary}-${text}-${accent}-${tileVars.tileColor}`}
      dangerouslySetInnerHTML={{ __html: css }}
    />
  );
}
