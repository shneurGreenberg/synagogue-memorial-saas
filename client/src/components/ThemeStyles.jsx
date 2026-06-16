import React from 'react';
import { useBoardData } from '../context/BoardDataContext';
import { assetUrl } from '../lib/asset-url';

export function ThemeStyles() {
  const { data, revision } = useBoardData();
  const theme = data.theme || {};
  const primary = theme.primaryColor || '#cfaf1f';
  const text = theme.textColor || '#bfbfbf';
  const accent = theme.accentColor || '#ffd54f';

  const css = `
    :root {
      --primary-color: ${primary};
      --text-color: ${text};
      --accent-color: ${accent};
      --tile-title-color: ${primary};
      --tile-date-color: ${text};
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
    .main-container .board-accent,
    .main-container .board-accent h1,
    .main-container .board-accent h2,
    .main-container .board-accent h3,
    .main-container .board-accent time,
    .main-container .shabbat-times .shabbat-label,
    .main-container .shabbat-times .shabbat-time,
    .main-container .shabbat-times .shabbat-parsha-heading,
    .main-container .shabbat-times .shabbat-parsha-name {
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
    .wooden-panel {
      ${theme.tilesBackground ? `background-image: url('${assetUrl(`images/${theme.tilesBackground}`)}') !important;
      background-size: cover;` : ''}
    }
  `;

  return <style key={`theme-${revision}-${primary}-${text}-${accent}`} dangerouslySetInnerHTML={{ __html: css }} />;
}
