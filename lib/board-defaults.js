// Original memorial board appearance (matches styles/common.scss defaults)
const OFFICIAL_LOGO_FILENAME = 'kaddish-official-logo.svg';

const {
  PANEL_BORDER_DEFAULT_COLOR,
  TILE_BORDER_DEFAULT_COLOR,
  PANEL_BORDER_DEFAULT_WIDTH,
  PANEL_BORDER_DEFAULT_RADIUS,
  TILE_BORDER_DEFAULT_WIDTH,
  TILE_BORDER_DEFAULT_RADIUS,
} = require('./theme-borders');

const BOARD_THEME_DEFAULTS = {
  primaryColor: '#cfaf1f',
  textColor: '#f0f0f0',
  accentColor: '#ffd54f',
  tileColor: '#b89a22',
  tileOpacity: 100,
  panelBorderColor: PANEL_BORDER_DEFAULT_COLOR,
  panelBorderOpacity: 100,
  panelBorderRadius: PANEL_BORDER_DEFAULT_RADIUS,
  panelBorderWidth: PANEL_BORDER_DEFAULT_WIDTH,
  tileBorderColor: TILE_BORDER_DEFAULT_COLOR,
  tileBorderOpacity: 100,
  tileBorderRadius: TILE_BORDER_DEFAULT_RADIUS,
  tileBorderWidth: TILE_BORDER_DEFAULT_WIDTH,
  logo: 'banner-transparent.png',
};

const BOARD_BACKGROUND_DEFAULTS = {
  backgroundImage: 'brickwall.jpg',
  tilesBackground: 'wood2.png',
};

module.exports = {
  OFFICIAL_LOGO_FILENAME,
  BOARD_THEME_DEFAULTS,
  BOARD_BACKGROUND_DEFAULTS,
};
