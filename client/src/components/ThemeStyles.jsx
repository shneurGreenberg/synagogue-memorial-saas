import React, { useEffect } from 'react';
import { getBoardData } from '../lib/board-data';

export function ThemeStyles() {
  const data = getBoardData();
  const theme = data.theme || {};
  const isLight = theme.colorMode === 'light';
  const defaultTextColor = isLight ? '#2c2418' : '#d9d9d9';

  useEffect(() => {
    document.documentElement.setAttribute('data-board-theme', isLight ? 'light' : 'dark');

    return () => {
      document.documentElement.removeAttribute('data-board-theme');
    };
  }, [isLight]);

  const css = `
    :root {
      --primary-color: ${theme.primaryColor || '#cfaf1f'};
      --text-color: ${theme.textColor || defaultTextColor};
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
  `;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
