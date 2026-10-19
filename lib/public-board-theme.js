const { BOARD_THEME_DEFAULTS, BOARD_BACKGROUND_DEFAULTS } = require('./board-defaults');
const { enrichSynagogueForAdmin } = require('./admin-theme');
const { buildTileThemeVars } = require('./tile-theme-colors');
const { normalizeTileOpacity } = require('./theme-typography');
const { normalizeThemeBorders, resolvePanelBorderCss, resolveTileBorderCss } = require('./theme-borders');
const { resolveBoardBackgroundImage } = require('./board-backgrounds');
const { buildGoogleFontsHref, resolveBoardFontFamily, normalizeBoardFont } = require('./board-fonts');

function resolvePublicBoardTheme(synagogue) {
  const enriched = enrichSynagogueForAdmin(synagogue || { theme: {} });
  return enriched.theme || { ...BOARD_THEME_DEFAULTS };
}

function buildPublicBoardThemeCss(synagogue) {
  const theme = resolvePublicBoardTheme(synagogue);
  const primary = theme.primaryColor || BOARD_THEME_DEFAULTS.primaryColor;
  const text = theme.textColor || BOARD_THEME_DEFAULTS.textColor;
  const accent = theme.accentColor || BOARD_THEME_DEFAULTS.accentColor;
  const tileVars = buildTileThemeVars(
    theme.tileColor || BOARD_THEME_DEFAULTS.tileColor,
    primary,
    normalizeTileOpacity(theme.tileOpacity),
  );
  const themeBorders = normalizeThemeBorders(theme);
  const panelBorderCss = resolvePanelBorderCss(theme);
  const tileBorderCss = resolveTileBorderCss(theme, tileVars.tileGlassBorder);
  const backgroundImage = resolveBoardBackgroundImage(theme) || BOARD_BACKGROUND_DEFAULTS.backgroundImage;
  const boardFontFamily = resolveBoardFontFamily(normalizeBoardFont(theme.boardFont));
  const bgUrl = `/images/${backgroundImage}`;

  return `
:root {
  --panel-border-color: ${panelBorderCss};
  --panel-border-width: ${themeBorders.panelBorderWidth}px;
  --panel-border-radius: ${themeBorders.panelBorderRadius}px;
  --tile-border-color: ${tileBorderCss};
  --tile-border-width: ${themeBorders.tileBorderWidth}px;
  --tile-border-radius: ${themeBorders.tileBorderRadius}px;
  --primary-color: ${primary};
  --text-color: ${text};
  --accent-color: ${accent};
  --tile-color: ${tileVars.tileColor};
  --tile-glass-base: ${tileVars.tileGlassBase};
  --tile-glass-mid: ${tileVars.tileGlassMid};
  --tile-glass-fade: ${tileVars.tileGlassFade};
  --tile-glass-frost: ${tileVars.tileGlassFrost};
  --tile-glass-border: ${tileVars.tileGlassBorder};
  --tile-glass-highlight: ${tileVars.tileGlassHighlight};
  --tile-glass-glow: ${tileVars.tileGlassGlow};
  --tile-glass-legacy-glow: ${tileVars.tileGlassLegacyGlow};
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
  --public-page-bg-image: url('${bgUrl}');
  --public-board-font-family: ${boardFontFamily};
}
body.public-submission-page,
body.onboarding-body,
body.scan-grave-page {
  font-family: var(--public-board-font-family) !important;
  color: var(--text-color) !important;
  background-color: #2a2118;
  background-image:
    linear-gradient(rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0.55)),
    var(--public-page-bg-image) !important;
  background-size: cover;
  background-position: center;
  background-attachment: scroll;
}
.public-card,
.scan-grave-card {
  border-radius: var(--tile-border-radius, 18px);
  border-width: var(--tile-border-width, 1px);
  border-color: var(--tile-border-color, var(--tile-glass-border));
}
`.trim();
}

function buildPublicBoardThemeRender(synagogue) {
  const theme = resolvePublicBoardTheme(synagogue);
  const fontHref = buildGoogleFontsHref(theme.boardFont);
  const css = buildPublicBoardThemeCss(synagogue);
  return {
    publicBoardThemeStyle: `<style id="public-board-theme">\n${css}\n</style>`,
    publicBoardFontHref: fontHref || '',
    publicThemePrimaryColor: theme.primaryColor || BOARD_THEME_DEFAULTS.primaryColor,
  };
}

module.exports = {
  resolvePublicBoardTheme,
  buildPublicBoardThemeCss,
  buildPublicBoardThemeRender,
};
