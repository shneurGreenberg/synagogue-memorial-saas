import React from 'react';
import { useBoardData } from '../context/BoardDataContext';
import { assetUrl } from '../lib/asset-url';

const DEFAULT_TILE_COLOR = '#b89a22';

export function ThemeStyles() {
  const { data, revision } = useBoardData();
  const theme = data.theme || {};
  const primary = theme.primaryColor || '#cfaf1f';
  const text = theme.textColor || '#bfbfbf';
  const accent = theme.accentColor || '#ffd54f';
  const tile = theme.tileColor || DEFAULT_TILE_COLOR;

  const css = `
    :root {
      --primary-color: ${primary};
      --text-color: ${text};
      --accent-color: ${accent};
      --tile-color: ${tile};
      --tile-title-color: ${primary};
      --tile-date-color: ${text};
      --tile-panel-mid: color-mix(in srgb, ${tile} 50%, transparent);
      --tile-panel-fade: color-mix(in srgb, ${tile} 35%, transparent);
      --tile-surface-light: color-mix(in srgb, ${tile} 88%, #fff);
      --tile-surface-dark: color-mix(in srgb, ${tile} 78%, #000);
      --tile-surface-border: color-mix(in srgb, ${tile} 58%, #000);
      --tile-panel-border: color-mix(in srgb, ${tile} 72%, #000);
      --card-button: color-mix(in srgb, ${primary} 85%, #000);
      --card-button-border: color-mix(in srgb, ${primary} 70%, #000);
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
    .main-container .cards-grid .card,
    .main-container .cards-grid-kadish .card,
    .golden-panel {
      background: linear-gradient(
        80deg,
        rgba(0, 0, 0, 100%) 0%,
        rgba(0, 0, 0, 100%) 24%,
        var(--tile-panel-mid) 48%,
        var(--tile-panel-fade)
      ), url('${assetUrl('images/gold.png')}') !important;
      border-color: var(--tile-panel-border) !important;
    }
    .main-container .search input,
    .main-container .pager .pager-btn {
      background: linear-gradient(165deg, var(--tile-surface-light), var(--tile-surface-dark)) !important;
      background-color: var(--tile-surface-dark) !important;
      border-color: var(--tile-surface-border) !important;
    }
  `;

  return <style key={`theme-${revision}-${primary}-${text}-${accent}-${tile}`} dangerouslySetInnerHTML={{ __html: css }} />;
}
