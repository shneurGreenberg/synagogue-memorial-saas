/** Default memorial board titles (same as Novosibirsk seed / static snapshot). */
const DEFAULT_BOARD_TITLES = {
  ru: 'Проект памяти наших родных "Кадиш"',
  en: '"Kaddish": A Project in Memory of Our Loved Ones',
  he: 'פרויקט הזיכרון קדיש',
};

function resolveBoardTitles(input = {}) {
  return {
    ru: String(input.ru ?? '').trim() || DEFAULT_BOARD_TITLES.ru,
    en: String(input.en ?? '').trim() || DEFAULT_BOARD_TITLES.en,
    he: String(input.he ?? '').trim() || DEFAULT_BOARD_TITLES.he,
  };
}

function primaryBoardTitle(titles) {
  const resolved = resolveBoardTitles(titles);
  return resolved.ru || resolved.en || resolved.he;
}

module.exports = {
  DEFAULT_BOARD_TITLES,
  resolveBoardTitles,
  primaryBoardTitle,
};
