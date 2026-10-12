const { BOARD_THEME_DEFAULTS } = require('./board-defaults');

function communityLogoUrl(synagogue) {
  const logo = (synagogue && synagogue.theme && synagogue.theme.logo) || BOARD_THEME_DEFAULTS.logo;
  if (!logo) {
    return `/images/${BOARD_THEME_DEFAULTS.logo}`;
  }
  if (/^https?:\/\//i.test(logo)) {
    return logo;
  }
  return `/images/${String(logo).replace(/^\/+/, '')}`;
}

module.exports = {
  communityLogoUrl,
};
