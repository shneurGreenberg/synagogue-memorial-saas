const { boardQrImageUrl } = require('./public-submission');
const {
  extractSnapshot,
  normalizeSnapshot,
  readSavedViewName,
} = require('./saved-views');

const EXPORT_FORMAT = 'kaddish-saved-view';
const EXPORT_FORMAT_VERSION = 1;

const STRIP_IMPORT_KEYS = new Set([
  'id',
  '_id',
  'viewId',
  'slug',
  'synagogueId',
  'communityId',
  'activeSavedViewId',
  'screenshot',
  'savedAt',
  'createdAt',
]);

function imageRefToUrl(relativePath) {
  const value = String(relativePath || '').trim();
  if (!value) {
    return '';
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return boardQrImageUrl(value);
}

function memorialQrPanelToImportBody(panel) {
  const source = panel || {};
  const titles = source.titles || {};
  const texts = source.texts || {};
  const donationTitles = source.donationTitles || {};
  const donationTexts = source.donationTexts || {};

  return {
    memorialQrTitleRu: titles.ru || '',
    memorialQrTitleEn: titles.en || '',
    memorialQrTitleHe: titles.he || '',
    memorialQrTextRu: texts.ru || '',
    memorialQrTextEn: texts.en || '',
    memorialQrTextHe: texts.he || '',
    donationQrTitleRu: donationTitles.ru || '',
    donationQrTitleEn: donationTitles.en || '',
    donationQrTitleHe: donationTitles.he || '',
    donationQrTextRu: donationTexts.ru || '',
    donationQrTextEn: donationTexts.en || '',
    donationQrTextHe: donationTexts.he || '',
    memorialQrTitleScale: source.titleScale,
    memorialQrTextScale: source.textScale,
    memorialQrQrScale: source.qrScale,
  };
}

function stripPortableMetadata(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  const next = {};
  Object.entries(value).forEach(([key, entry]) => {
    if (STRIP_IMPORT_KEYS.has(key)) {
      return;
    }
    next[key] = stripPortableMetadata(entry);
  });
  return next;
}

function normalizeImportedSnapshot(imported, synagogue) {
  const cleaned = stripPortableMetadata(imported);
  const snap = cleaned.snapshot && typeof cleaned.snapshot === 'object'
    ? cleaned.snapshot
    : cleaned;
  const theme = snap.theme || {};
  const titles = snap.titles || {};
  const publicSubmission = snap.publicSubmission || {};
  const body = {
    titleRu: titles.ru,
    titleEn: titles.en,
    titleHe: titles.he,
    language: snap.language,
    primaryColor: theme.primaryColor,
    textColor: theme.textColor,
    accentColor: theme.accentColor,
    tileColor: theme.tileColor,
    tileOpacity: theme.tileOpacity,
    logoBorderRadius: theme.logoBorderRadius,
    boardFont: theme.boardFont,
    candlePalette: theme.candlePalette,
    logo: theme.logo,
    backgroundImage: theme.backgroundImage,
    tilesBackground: theme.tilesBackground,
    shabbatTimesEnabled: snap.shabbatTimesEnabled ? '1' : '0',
    publicSubmissionEnabled: publicSubmission.enabled ? '1' : '0',
    publicSubmissionDonationUrl: publicSubmission.donationUrl || '',
    publicSubmissionShowDonationQr: publicSubmission.showDonationQr !== false ? '1' : '0',
    publicSubmissionShowRegistrationQr: publicSubmission.showRegistrationQr !== false ? '1' : '0',
    donationQrImage: publicSubmission.donationQrImage || '',
    registrationQrImage: publicSubmission.registrationQrImage || '',
    boardFeatures: snap.boardFeatures,
    ...memorialQrPanelToImportBody(snap.memorialQrPanel),
  };

  if (theme.fontScales && typeof theme.fontScales === 'object') {
    Object.entries(theme.fontScales).forEach(([key, scale]) => {
      body[`fontScale_${key}`] = scale;
    });
  }

  return normalizeSnapshot(body, synagogue);
}

function buildSavedViewExport(view) {
  const snapshot = extractSnapshot(view);
  const theme = snapshot.theme || {};
  const publicSubmission = snapshot.publicSubmission || {};

  return {
    format: EXPORT_FORMAT,
    formatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    name: readSavedViewName(view),
    snapshot,
    assets: {
      logo: imageRefToUrl(theme.logo),
      backgroundImage: imageRefToUrl(theme.backgroundImage),
      tilesBackground: imageRefToUrl(theme.tilesBackground),
      donationQrImage: imageRefToUrl(publicSubmission.donationQrImage),
      registrationQrImage: imageRefToUrl(publicSubmission.registrationQrImage),
    },
  };
}

function readImportName(imported, fallbackName) {
  const source = imported && typeof imported === 'object' ? imported : {};
  return String(source.name || source.snapshot?.name || fallbackName || '').trim();
}

function buildExportContentDisposition(view) {
  const v = view || {};
  const idPart = String(v.id || v._id || 'view').replace(/[^A-Za-z0-9_-]+/g, '').slice(0, 40) || 'view';
  const fallback = 'saved-view-' + idPart + '.json';
  const cleanName = String(v.name || '').replace(/[\u0000-\u001f\u007f"\\/:*?<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!cleanName) return 'attachment; filename="' + fallback + '"';
  return 'attachment; filename="' + fallback + '"; filename*=UTF-8\'\'' + encodeURIComponent(cleanName + '.json');
}

module.exports = {
  buildExportContentDisposition,
  EXPORT_FORMAT,
  EXPORT_FORMAT_VERSION,
  buildSavedViewExport,
  normalizeImportedSnapshot,
  readImportName,
  imageRefToUrl,
};
