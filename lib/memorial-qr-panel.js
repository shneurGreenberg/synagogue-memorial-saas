const MEMORIAL_QR_DEFAULTS = {
  titles: {
    ru: 'Добавить имя близкого',
    en: 'Add your loved one',
    he: 'רוצים להוסיף את שם יקירכם?',
  },
  texts: {
    ru: 'Сканируйте QR-код для регистрации близких',
    en: 'Scan the QR code to register loved ones',
    he: 'סרקו את הברקוד לרישום יקירים',
  },
  titleScale: 100,
  textScale: 100,
  qrScale: 140,
};

const DONATION_QR_DEFAULTS = {
  titles: {
    ru: 'Цдака — пожертвование',
    en: 'Charity — donation',
    he: 'צדקה',
  },
  texts: {
    ru: 'Отсканируйте QR-код, чтобы сделать пожертвование в память о близких',
    en: 'Scan the QR code to make a donation in memory of loved ones',
    he: 'סרקו את הברקוד לתרומה לזכר יקירים',
  },
};

const LANGS = ['ru', 'en', 'he'];

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function normalizeLangTriplet(raw, fallback = {}) {
  const source = raw || {};
  const normalized = {};

  LANGS.forEach((lang) => {
    normalized[lang] = String(source[lang] ?? fallback[lang] ?? '').trim();
  });

  return normalized;
}

function resolveLangTriplet(stored, defaults) {
  const result = {};
  LANGS.forEach((lang) => {
    const custom = String(stored[lang] ?? '').trim();
    result[lang] = custom || defaults[lang];
  });
  return result;
}

function normalizeMemorialQrPanel(raw) {
  const source = raw || {};

  return {
    titles: normalizeLangTriplet(source.titles),
    texts: normalizeLangTriplet(source.texts),
    donationTitles: normalizeLangTriplet(source.donationTitles),
    donationTexts: normalizeLangTriplet(source.donationTexts),
    titleScale: clampNumber(source.titleScale, 50, 200, MEMORIAL_QR_DEFAULTS.titleScale),
    textScale: clampNumber(source.textScale, 50, 200, MEMORIAL_QR_DEFAULTS.textScale),
    qrScale: clampNumber(source.qrScale, 80, 250, MEMORIAL_QR_DEFAULTS.qrScale),
    titleScaleBaseline: clampNumber(source.titleScaleBaseline, 50, 400, 100),
    textScaleBaseline: clampNumber(source.textScaleBaseline, 50, 400, 100),
    qrScaleBaseline: clampNumber(source.qrScaleBaseline, 80, 400, 100),
  };
}

function memorialQrPanelWithResolvedCopy(raw) {
  const panel = normalizeMemorialQrPanel(raw);

  return {
    ...panel,
    titles: resolveLangTriplet(panel.titles, MEMORIAL_QR_DEFAULTS.titles),
    texts: resolveLangTriplet(panel.texts, MEMORIAL_QR_DEFAULTS.texts),
    donationTitles: resolveLangTriplet(panel.donationTitles, DONATION_QR_DEFAULTS.titles),
    donationTexts: resolveLangTriplet(panel.donationTexts, DONATION_QR_DEFAULTS.texts),
  };
}

function memorialQrPanelForBoard(raw) {
  return memorialQrPanelWithResolvedCopy(raw);
}

function memorialQrPanelForAdminEdit(raw) {
  return memorialQrPanelWithResolvedCopy(raw);
}

function readTripletFromBody(body, prefix, existing) {
  const result = { ...existing };
  LANGS.forEach((lang) => {
    const suffix = lang === 'ru' ? 'Ru' : lang === 'en' ? 'En' : 'He';
    const key = `${prefix}${suffix}`;
    if (key in body) {
      result[lang] = String(body[key] ?? '').trim();
    }
  });
  return result;
}

function parseMemorialQrPanelFromBody(body, existingPanel) {
  const existing = normalizeMemorialQrPanel(existingPanel);

  return normalizeMemorialQrPanel({
    ...existing,
    titles: readTripletFromBody(body, 'memorialQrTitle', existing.titles),
    texts: readTripletFromBody(body, 'memorialQrText', existing.texts),
    donationTitles: readTripletFromBody(body, 'donationQrTitle', existing.donationTitles),
    donationTexts: readTripletFromBody(body, 'donationQrText', existing.donationTexts),
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
    'memorialQrPanel.donationTitles.ru': normalized.donationTitles.ru,
    'memorialQrPanel.donationTitles.en': normalized.donationTitles.en,
    'memorialQrPanel.donationTitles.he': normalized.donationTitles.he,
    'memorialQrPanel.donationTexts.ru': normalized.donationTexts.ru,
    'memorialQrPanel.donationTexts.en': normalized.donationTexts.en,
    'memorialQrPanel.donationTexts.he': normalized.donationTexts.he,
    'memorialQrPanel.titleScale': normalized.titleScale,
    'memorialQrPanel.textScale': normalized.textScale,
    'memorialQrPanel.qrScale': normalized.qrScale,
    'memorialQrPanel.titleScaleBaseline': normalized.titleScaleBaseline,
    'memorialQrPanel.textScaleBaseline': normalized.textScaleBaseline,
    'memorialQrPanel.qrScaleBaseline': normalized.qrScaleBaseline,
  };
}

module.exports = {
  MEMORIAL_QR_DEFAULTS,
  DONATION_QR_DEFAULTS,
  normalizeMemorialQrPanel,
  memorialQrPanelForBoard,
  memorialQrPanelForAdminEdit,
  parseMemorialQrPanelFromBody,
  memorialQrPanelToUpdate,
};
