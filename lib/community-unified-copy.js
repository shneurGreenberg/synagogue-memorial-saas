const BOARD_LANGS = ['ru', 'en', 'he'];

function firstNonEmpty(values) {
  for (let i = 0; i < values.length; i += 1) {
    const value = String(values[i] ?? '').trim();
    if (value) {
      return value;
    }
  }
  return '';
}

function normalizeDisplayLang(lang) {
  return BOARD_LANGS.includes(lang) ? lang : 'ru';
}

/**
 * Lazy unified community copy: stored single field wins; else legacy triplet[displayLang];
 * else first non-empty among ru, en, he.
 */
function resolveUnifiedText(storedSingle, legacyTriplet, displayLang) {
  const single = String(storedSingle ?? '').trim();
  if (single) {
    return single;
  }

  const triplet = legacyTriplet && typeof legacyTriplet === 'object' ? legacyTriplet : {};
  const lang = normalizeDisplayLang(displayLang);
  const fromLang = String(triplet[lang] ?? '').trim();
  if (fromLang) {
    return fromLang;
  }

  return firstNonEmpty([triplet.ru, triplet.en, triplet.he]);
}

function resolveBoardTitleText(synagogue) {
  if (!synagogue || typeof synagogue !== 'object') {
    return '';
  }

  const legacyTitle = String(synagogue.title || '').trim();
  const triplet = synagogue.titles || {};
  const legacyTriplet = {
    ru: String(triplet.ru ?? legacyTitle).trim(),
    en: String(triplet.en ?? '').trim(),
    he: String(triplet.he ?? '').trim(),
  };

  return resolveUnifiedText(
    synagogue.boardTitleText,
    legacyTriplet,
    synagogue.language || 'ru',
  );
}

module.exports = {
  BOARD_LANGS,
  firstNonEmpty,
  normalizeDisplayLang,
  resolveUnifiedText,
  resolveBoardTitleText,
};
