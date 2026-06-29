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

export function resolveCommunityEventDisplayLang(boardLang) {
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

export function normalizeCommunityEvent(event) {
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

export function resolveCommunityEventCopy(event, boardLang) {
  const normalized = normalizeCommunityEvent(event);
  return {
    title: pickLocalizedCopy(normalized.titles, boardLang),
    text: pickLocalizedCopy(normalized.texts, boardLang),
  };
}
