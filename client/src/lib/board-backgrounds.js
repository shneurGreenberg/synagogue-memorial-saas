export const BOARD_BACKGROUND_DEFAULTS = {
  backgroundImage: 'brickwall.jpg',
  tilesBackground: 'wood2.png',
};

export function resolveBoardBackgroundImage(theme = {}) {
  return theme.backgroundImage || BOARD_BACKGROUND_DEFAULTS.backgroundImage;
}

export function resolveTilesBackgroundImage(theme = {}) {
  return theme.tilesBackground || BOARD_BACKGROUND_DEFAULTS.tilesBackground;
}
