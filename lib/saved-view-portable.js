const { boardQrImageUrl } = require('./public-submission');
const { stripCommunityBrandingFromSnapshot } = require('./saved-view-branding');
const { pickDesignFromSnapshot } = require('./saved-view-design');
const {
  extractSnapshot,
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
  return pickDesignFromSnapshot(snap);
}

function buildSavedViewExport(view) {
  const snapshot = stripCommunityBrandingFromSnapshot(extractSnapshot(view));
  const theme = snapshot.theme || {};

  return {
    format: EXPORT_FORMAT,
    formatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    name: readSavedViewName(view),
    snapshot,
    assets: {
      backgroundImage: imageRefToUrl(theme.backgroundImage),
      tilesBackground: imageRefToUrl(theme.tilesBackground),
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
