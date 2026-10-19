const { resolveUnifiedText } = require('./community-unified-copy');

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

function defaultUnifiedString(defaultsTriplet, displayLang) {
  const resolved = resolveLangTriplet({}, defaultsTriplet);
  const lang = LANGS.includes(displayLang) ? displayLang : 'ru';
  return resolved[lang] || resolved.ru || resolved.en || resolved.he || '';
}

function resolvePanelCopyField(storedSingle, legacyTriplet, displayLang, defaultsTriplet, { applyDefaults }) {
  const unified = resolveUnifiedText(storedSingle, legacyTriplet, displayLang);
  if (unified) {
    return unified;
  }
  if (applyDefaults) {
    return defaultUnifiedString(defaultsTriplet, displayLang);
  }
  return '';
}

function normalizeMemorialQrPanel(raw) {
  const source = raw || {};

  return {
    titles: normalizeLangTriplet(source.titles),
    texts: normalizeLangTriplet(source.texts),
    donationTitles: normalizeLangTriplet(source.donationTitles),
    donationTexts: normalizeLangTriplet(source.donationTexts),
    titleText: String(source.titleText ?? '').trim(),
    textText: String(source.textText ?? '').trim(),
    donationTitleText: String(source.donationTitleText ?? '').trim(),
    donationTextText: String(source.donationTextText ?? '').trim(),
    titleScale: clampNumber(source.titleScale, 50, 200, MEMORIAL_QR_DEFAULTS.titleScale),
    textScale: clampNumber(source.textScale, 50, 200, MEMORIAL_QR_DEFAULTS.textScale),
    qrScale: clampNumber(source.qrScale, 80, 250, MEMORIAL_QR_DEFAULTS.qrScale),
    titleScaleBaseline: clampNumber(source.titleScaleBaseline, 50, 400, 100),
    textScaleBaseline: clampNumber(source.textScaleBaseline, 50, 400, 100),
    qrScaleBaseline: clampNumber(source.qrScaleBaseline, 80, 400, 100),
  };
}

function memorialQrPanelWithResolvedCopy(raw, displayLang, { applyDefaults = true } = {}) {
  const panel = normalizeMemorialQrPanel(raw);
  const lang = displayLang || 'ru';

  const titleText = resolvePanelCopyField(
    panel.titleText,
    panel.titles,
    lang,
    MEMORIAL_QR_DEFAULTS.titles,
    { applyDefaults },
  );
  const textText = resolvePanelCopyField(
    panel.textText,
    panel.texts,
    lang,
    MEMORIAL_QR_DEFAULTS.texts,
    { applyDefaults },
  );
  const donationTitleText = resolvePanelCopyField(
    panel.donationTitleText,
    panel.donationTitles,
    lang,
    DONATION_QR_DEFAULTS.titles,
    { applyDefaults },
  );
  const donationTextText = resolvePanelCopyField(
    panel.donationTextText,
    panel.donationTexts,
    lang,
    DONATION_QR_DEFAULTS.texts,
    { applyDefaults },
  );

  return {
    ...panel,
    titleText,
    textText,
    donationTitleText,
    donationTextText,
    titles: resolveLangTriplet(panel.titles, MEMORIAL_QR_DEFAULTS.titles),
    texts: resolveLangTriplet(panel.texts, MEMORIAL_QR_DEFAULTS.texts),
    donationTitles: resolveLangTriplet(panel.donationTitles, DONATION_QR_DEFAULTS.titles),
    donationTexts: resolveLangTriplet(panel.donationTexts, DONATION_QR_DEFAULTS.texts),
  };
}

function memorialQrPanelForBoard(raw, displayLang = 'ru') {
  return memorialQrPanelWithResolvedCopy(raw, displayLang, { applyDefaults: true });
}

function memorialQrPanelForAdminEdit(raw, displayLang = 'ru') {
  const panel = normalizeMemorialQrPanel(raw);
  const lang = displayLang || 'ru';

  return {
    ...panel,
    titleText: resolvePanelCopyField(panel.titleText, panel.titles, lang, MEMORIAL_QR_DEFAULTS.titles, { applyDefaults: false }),
    textText: resolvePanelCopyField(panel.textText, panel.texts, lang, MEMORIAL_QR_DEFAULTS.texts, { applyDefaults: false }),
    donationTitleText: resolvePanelCopyField(
      panel.donationTitleText,
      panel.donationTitles,
      lang,
      DONATION_QR_DEFAULTS.titles,
      { applyDefaults: false },
    ),
    donationTextText: resolvePanelCopyField(
      panel.donationTextText,
      panel.donationTexts,
      lang,
      DONATION_QR_DEFAULTS.texts,
      { applyDefaults: false },
    ),
  };
}

function readSingleFromBody(body, key, existing) {
  if (body && Object.prototype.hasOwnProperty.call(body, key)) {
    return String(body[key] ?? '').trim();
  }
  return existing;
}

function parseMemorialQrPanelFromBody(body, existingPanel) {
  const existing = normalizeMemorialQrPanel(existingPanel);

  return normalizeMemorialQrPanel({
    ...existing,
    titleText: readSingleFromBody(body, 'memorialQrTitle', existing.titleText),
    textText: readSingleFromBody(body, 'memorialQrText', existing.textText),
    donationTitleText: readSingleFromBody(body, 'donationQrTitle', existing.donationTitleText),
    donationTextText: readSingleFromBody(body, 'donationQrText', existing.donationTextText),
    titleScale: body.memorialQrTitleScale,
    textScale: body.memorialQrTextScale,
    qrScale: body.memorialQrQrScale,
  });
}

function memorialQrPanelToUpdate(panel) {
  const normalized = normalizeMemorialQrPanel(panel);
  return {
    'memorialQrPanel.titleText': normalized.titleText,
    'memorialQrPanel.textText': normalized.textText,
    'memorialQrPanel.donationTitleText': normalized.donationTitleText,
    'memorialQrPanel.donationTextText': normalized.donationTextText,
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
