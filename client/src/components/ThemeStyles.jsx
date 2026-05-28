import React from 'react';
import { useBoardData } from '../context/BoardDataContext';

export function ThemeStyles() {
  const { data } = useBoardData();
  const theme = data.theme || {};
  const primary = theme.primaryColor || '#d4af37';
  const text = theme.textColor || '#ffffff';

  const css = `
    :root {
      --primary-color: ${primary};
      --text-color: ${text};
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
    .main-container .right .inner,
    .main-container .right .inner h1,
    .main-container .right .inner h2,
    .main-container .right .inner h3,
    .main-container .right .inner time,
    .main-container .daily-cite,
    .main-container .weekly-chapter h3 {
      color: var(--tile-date-color) !important;
    }
    body,
    .main-container {
      color: var(--text-color) !important;
      ${theme.backgroundImage ? `background-image: url('/images/${theme.backgroundImage}') !important;
      background-size: cover;
      background-position: center;
      background-attachment: fixed;` : ''}
    }
    .wooden-panel {
      ${theme.tilesBackground ? `background-image: url('/images/${theme.tilesBackground}') !important;
      background-size: cover;` : ''}
    }
  `;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
