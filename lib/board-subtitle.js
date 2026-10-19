const { BOARD_THEME_DEFAULTS } = require('./board-defaults');
const { normalizeBoardFont } = require('./board-fonts');

function sanitizeHexColor(value, fallback) {
  const candidate = String(value || '').trim();
  return /^#[0-9A-Fa-f]{6}$/.test(candidate) ? candidate : fallback;
}

const BOARD_SUBTITLE_WEIGHTS = new Set(['400', '500', '600', '700']);

function normalizeBoardSubtitle(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    enabled: source.enabled === true,
    text: String(source.text ?? '').trim(),
  };
}

function normalizeBoardSubtitleWeight(value) {
  const raw = String(value ?? '').trim();
  return BOARD_SUBTITLE_WEIGHTS.has(raw) ? raw : '400';
}

function normalizeBoardSubtitleTheme(theme) {
  const source = theme && typeof theme === 'object' ? theme : {};
  const color = String(source.boardSubtitleColor ?? '').trim();
  const font = String(source.boardSubtitleFont ?? '').trim();

  return {
    boardSubtitleColor: color && /^#[0-9A-Fa-f]{6}$/.test(color)
      ? color
      : sanitizeHexColor(BOARD_THEME_DEFAULTS.textColor, BOARD_THEME_DEFAULTS.textColor),
    boardSubtitleFont: font ? normalizeBoardFont(font) : '',
    boardSubtitleWeight: normalizeBoardSubtitleWeight(source.boardSubtitleWeight),
  };
}

function parseBoardSubtitleFromBody(body, existing) {
  const current = normalizeBoardSubtitle(existing);
  const source = body || {};

  return normalizeBoardSubtitle({
    enabled: 'boardSubtitleEnabled' in source
      ? source.boardSubtitleEnabled === '1'
        || source.boardSubtitleEnabled === true
        || source.boardSubtitleEnabled === 'on'
      : current.enabled,
    text: 'boardSubtitleText' in source
      ? String(source.boardSubtitleText ?? '').trim()
      : current.text,
  });
}

function boardSubtitleToUpdate(subtitle) {
  const normalized = normalizeBoardSubtitle(subtitle);
  return {
    'boardSubtitle.enabled': normalized.enabled,
    'boardSubtitle.text': normalized.text,
  };
}

function parseBoardSubtitleThemeFromBody(body, existingTheme) {
  const current = normalizeBoardSubtitleTheme(existingTheme);
  const source = body || {};

  return normalizeBoardSubtitleTheme({
    boardSubtitleColor: 'boardSubtitleColor' in source
      ? source.boardSubtitleColor
      : current.boardSubtitleColor,
    boardSubtitleFont: 'boardSubtitleFont' in source
      ? source.boardSubtitleFont
      : current.boardSubtitleFont,
    boardSubtitleWeight: 'boardSubtitleWeight' in source
      ? source.boardSubtitleWeight
      : current.boardSubtitleWeight,
  });
}

function boardSubtitleThemeToUpdate(themeSlice) {
  const normalized = normalizeBoardSubtitleTheme(themeSlice);
  return {
    'theme.boardSubtitleColor': normalized.boardSubtitleColor,
    'theme.boardSubtitleFont': normalized.boardSubtitleFont,
    'theme.boardSubtitleWeight': normalized.boardSubtitleWeight,
  };
}

module.exports = {
  BOARD_SUBTITLE_WEIGHTS,
  normalizeBoardSubtitle,
  normalizeBoardSubtitleTheme,
  parseBoardSubtitleFromBody,
  boardSubtitleToUpdate,
  parseBoardSubtitleThemeFromBody,
  boardSubtitleThemeToUpdate,
};
