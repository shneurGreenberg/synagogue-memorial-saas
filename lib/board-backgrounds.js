const { BOARD_BACKGROUND_DEFAULTS } = require('./board-defaults');

function resolveBoardBackgroundImage(theme = {}) {
  return theme.backgroundImage || BOARD_BACKGROUND_DEFAULTS.backgroundImage;
}

function resolveTilesBackgroundImage(theme = {}) {
  return theme.tilesBackground || BOARD_BACKGROUND_DEFAULTS.tilesBackground;
}

module.exports = {
  resolveBoardBackgroundImage,
  resolveTilesBackgroundImage,
};
