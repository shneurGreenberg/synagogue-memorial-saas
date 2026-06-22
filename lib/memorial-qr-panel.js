const MEMORIAL_QR_DEFAULTS = {
  titles: {
    ru: 'Добавить имя близкого',
    en: 'Add your loved one',
    he: 'רוצים להוסיף את שם יקירכם?',
  },
  texts: {
    ru: 'Отсканируйте QR-код, чтобы отправить имя',
    en: 'Scan the QR code to submit a name',
    he: 'סרקו את הברקוד',
  },
  titleScale: 100,
  textScale: 100,
  qrScale: 140,
};

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function normalizeMemorialQrPanel(raw) {
  const source = raw || {};
  const titles = source.titles || {};
  const texts = source.texts || {};

  return {
    titles: {
      ru: String(titles.ru ?? MEMORIAL_QR_DEFAULTS.titles.ru).trim() || MEMORIAL_QR_DEFAULTS.titles.ru,
      en: String(titles.en ?? MEMORIAL_QR_DEFAULTS.titles.en).trim() || MEMORIAL_QR_DEFAULTS.titles.en,
      he: String(titles.he ?? MEMORIAL_QR_DEFAULTS.titles.he).trim() || MEMORIAL_QR_DEFAULTS.titles.he,
    },
    texts: {
      ru: String(texts.ru ?? MEMORIAL_QR_DEFAULTS.texts.ru).trim() || MEMORIAL_QR_DEFAULTS.texts.ru,
      en: String(texts.en ?? MEMORIAL_QR_DEFAULTS.texts.en).trim() || MEMORIAL_QR_DEFAULTS.texts.en,
      he: String(texts.he ?? MEMORIAL_QR_DEFAULTS.texts.he).trim() || MEMORIAL_QR_DEFAULTS.texts.he,
    },
    titleScale: clampNumber(source.titleScale, 50, 200, MEMORIAL_QR_DEFAULTS.titleScale),
    textScale: clampNumber(source.textScale, 50, 200, MEMORIAL_QR_DEFAULTS.textScale),
    qrScale: clampNumber(source.qrScale, 80, 250, MEMORIAL_QR_DEFAULTS.qrScale),
  };
}

function parseMemorialQrPanelFromBody(body) {
  return normalizeMemorialQrPanel({
    titles: MEMORIAL_QR_DEFAULTS.titles,
    texts: {
      ru: body.memorialQrTextRu,
      en: body.memorialQrTextEn,
      he: body.memorialQrTextHe,
    },
    titleScale: body.memorialQrTitleScale,
    textScale: body.memorialQrTextScale,
    qrScale: body.memorialQrQrScale,
  });
}

function memorialQrPanelToUpdate(panel) {
  const normalized = normalizeMemorialQrPanel(panel);
  return {
    'memorialQrPanel.titles.ru': normalized.titles.ru,
    'memorialQrPanel.titles.en': normalized.titles.en,
    'memorialQrPanel.titles.he': normalized.titles.he,
    'memorialQrPanel.texts.ru': normalized.texts.ru,
    'memorialQrPanel.texts.en': normalized.texts.en,
    'memorialQrPanel.texts.he': normalized.texts.he,
    'memorialQrPanel.titleScale': normalized.titleScale,
    'memorialQrPanel.textScale': normalized.textScale,
    'memorialQrPanel.qrScale': normalized.qrScale,
  };
}

module.exports = {
  MEMORIAL_QR_DEFAULTS,
  normalizeMemorialQrPanel,
  parseMemorialQrPanelFromBody,
  memorialQrPanelToUpdate,
};
