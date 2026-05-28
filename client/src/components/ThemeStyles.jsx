import React from 'react';
import { getBoardData } from '../lib/board-data';

export function ThemeStyles() {
  const data = getBoardData();
  const theme = data.theme || {};
  const parsedGap = parseInt(theme.gridGap, 10);
  const gridGap = Number.isFinite(parsedGap) ? Math.min(32, Math.max(0, parsedGap)) : 8;

  const css = `
    :root {
      --primary-color: ${theme.primaryColor || '#cfaf1f'};
      --text-color: ${theme.textColor || '#d9d9d9'};
      --board-grid-gap: ${gridGap}px;
      --card-button: color-mix(in srgb, ${theme.primaryColor || '#cfaf1f'} 85%, #000);
      --card-button-border: color-mix(in srgb, ${theme.primaryColor || '#cfaf1f'} 70%, #000);
      --card-button-text: #1a1a1a;
    }
    .golden-text-mixin,
    h1,
    h2,
    h3 {
      color: var(--primary-color) !important;
    }
    body {
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
    .main-container .middle .cards-grid,
    .main-container .middle .cards-grid-kadish {
      gap: var(--board-grid-gap) !important;
      padding: var(--board-grid-gap) !important;
    }
  `;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
