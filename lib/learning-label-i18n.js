const { pickLang, translateLearningLine } = require('./jewish-translations');
const { translateWithCache, sanitizeLocalizedText } = require('./mymemory-translate');

function langPairForBoardLang(lang) {
  if (lang === 'ru') {
    return 'en|ru';
  }
  if (lang === 'he') {
    return 'en|he';
  }
  return null;
}

async function localizePlainLearningLabel(label, lang, options = {}) {
  const base = String(label || '').trim();
  if (!base || lang === 'en') {
    return base;
  }

  const dict = translateLearningLine(base, lang);
  const langPair = langPairForBoardLang(lang);
  if (!langPair) {
    return dict || base;
  }

  const apiText = await translateWithCache(base, langPair, options);
  const cleaned = sanitizeLocalizedText(apiText, dict || base);
  if (cleaned === base && dict && dict !== base) {
    return dict;
  }

  return cleaned;
}

async function localizeFromLocalizedFields(fields, lang, options = {}) {
  const english = pickLang(fields, 'en');
  const native = sanitizeLocalizedText(pickLang(fields, lang), '');
  if (native) {
    return native;
  }

  if (!english) {
    return '';
  }

  if (lang === 'en') {
    return english;
  }

  return localizePlainLearningLabel(english, lang, options);
}

async function mapLearningItem(label, lang, options = {}) {
  const resolved = await localizePlainLearningLabel(label, lang, options);
  return { label: resolved };
}

module.exports = {
  langPairForBoardLang,
  localizePlainLearningLabel,
  localizeFromLocalizedFields,
  mapLearningItem,
};
