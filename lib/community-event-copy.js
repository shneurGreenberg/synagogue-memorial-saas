const BOARD_LANGS = ['ru', 'en', 'he'];

function normalizeLocalizedField(raw, legacy = '') {
  const source = raw && typeof raw === 'object' ? raw : {};
  const fallback = String(legacy || '').trim();

  return {
    ru: String(source.ru ?? fallback).trim(),
    en: String(source.en ?? fallback).trim(),
    he: String(source.he ?? fallback).trim(),
  };
}

function resolveCommunityEventDisplayLang(boardLang) {
  const lang = BOARD_LANGS.includes(boardLang) ? boardLang : 'ru';
  return lang === 'he' ? 'en' : lang;
}

function pickLocalizedCopy(fields, boardLang) {
  const displayLang = resolveCommunityEventDisplayLang(boardLang);
  const normalized = normalizeLocalizedField(fields);

  return normalized[displayLang]
    || normalized.en
    || normalized.ru
    || normalized.he
    || '';
}

function normalizeCommunityEvent(event) {
  if (!event || typeof event !== 'object') {
    return event;
  }

  const legacyTitle = String(event.title || '').trim();
  const legacyText = String(event.text || '').trim();
  const titles = normalizeLocalizedField(event.titles, legacyTitle);
  const texts = normalizeLocalizedField(event.texts, legacyText);

  if (!titles.ru && legacyTitle) {
    titles.ru = legacyTitle;
  }
  if (!titles.en && legacyTitle) {
    titles.en = legacyTitle;
  }
  if (!texts.ru && legacyText) {
    texts.ru = legacyText;
  }
  if (!texts.en && legacyText) {
    texts.en = legacyText;
  }

  return {
    ...event,
    titles,
    texts,
    title: legacyTitle || titles.ru || titles.en || titles.he,
    text: legacyText || texts.ru || texts.en || texts.he,
  };
}

function resolveCommunityEventCopy(event, boardLang) {
  const normalized = normalizeCommunityEvent(event);
  const title = String(normalized.title || '').trim()
    || pickLocalizedCopy(normalized.titles, boardLang);
  const text = String(normalized.text || '').trim()
    || pickLocalizedCopy(normalized.texts, boardLang);
  return { title, text };
}

function firstNonEmpty(values) {
  for (let i = 0; i < values.length; i += 1) {
    const value = String(values[i] || '').trim();
    if (value) {
      return value;
    }
  }
  return '';
}

function parseCommunityEventCopyFromBody(body) {
  const source = body || {};
  const legacyTitle = String(source.eventTitle || source.title || '').trim();
  const legacyText = String(source.eventText || source.text || '').trim();

  const titles = {
    ru: String(source.titleRu ?? source.titles?.ru ?? '').trim(),
    en: String(source.titleEn ?? source.titles?.en ?? '').trim(),
    he: String(source.titleHe ?? source.titles?.he ?? '').trim(),
  };
  const texts = {
    ru: String(source.textRu ?? source.texts?.ru ?? '').trim(),
    en: String(source.textEn ?? source.texts?.en ?? '').trim(),
    he: String(source.textHe ?? source.texts?.he ?? '').trim(),
  };

  const primaryTitle = legacyTitle
    || firstNonEmpty([titles.he, titles.ru, titles.en])
    || firstNonEmpty([titles.en, titles.ru, titles.he]);
  const primaryText = legacyText
    || firstNonEmpty([texts.he, texts.ru, texts.en])
    || firstNonEmpty([texts.en, texts.ru, texts.he]);

  const mirroredTitles = { ru: primaryTitle, en: primaryTitle, he: primaryTitle };
  const mirroredTexts = { ru: primaryText, en: primaryText, he: primaryText };

  return {
    titles: mirroredTitles,
    texts: mirroredTexts,
    title: primaryTitle,
    text: primaryText,
  };
}

function resolveCommunityEventAdminCopy(event) {
  const normalized = normalizeCommunityEvent(event);
  const title = String(normalized.title || '').trim()
    || firstNonEmpty([
      normalized.titles.he,
      normalized.titles.ru,
      normalized.titles.en,
    ]);
  const text = String(normalized.text || '').trim()
    || firstNonEmpty([
      normalized.texts.he,
      normalized.texts.ru,
      normalized.texts.en,
    ]);

  return { title, text };
}

module.exports = {
  BOARD_LANGS,
  normalizeLocalizedField,
  resolveCommunityEventDisplayLang,
  pickLocalizedCopy,
  normalizeCommunityEvent,
  resolveCommunityEventCopy,
  parseCommunityEventCopyFromBody,
  resolveCommunityEventAdminCopy,
  firstNonEmpty,
};
