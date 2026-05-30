export function resolveBoardTitle(synagogue, lang) {
  if (!synagogue) {
    return '';
  }

  const titles = synagogue.titles || {};
  const custom = titles[lang] && String(titles[lang]).trim();

  if (custom) {
    return custom;
  }

  if (lang === 'ru') {
    return String(synagogue.title || synagogue.name || '').trim();
  }

  return '';
}
