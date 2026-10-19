const { DEFAULT_BOARD_TITLES } = require('./default-board-titles');
const { normalizeDisplayLang, resolveBoardTitleText } = require('./community-unified-copy');

function resolveBoardTitle(synagogue, lang) {
  const resolved = resolveBoardTitleText(synagogue);
  if (resolved) {
    return resolved;
  }

  const displayLang = normalizeDisplayLang(lang || synagogue?.language || 'ru');
  return DEFAULT_BOARD_TITLES[displayLang] || DEFAULT_BOARD_TITLES.ru;
}

module.exports = {
  resolveBoardTitle,
};
