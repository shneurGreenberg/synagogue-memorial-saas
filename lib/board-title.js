function resolveBoardTitle(synagogue, lang) {
  if (!synagogue) {
    return '';
  }

  const titles = synagogue.titles || {};
  const custom = titles[lang] && String(titles[lang]).trim();

  if (custom) {
    return custom;
  }

  const fallbackRu = titles.ru && String(titles.ru).trim();
  if (fallbackRu) {
    return fallbackRu;
  }

  return String(synagogue.title || synagogue.name || '').trim();
}

module.exports = {
  resolveBoardTitle,
};
