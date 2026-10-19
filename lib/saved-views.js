const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Synagogue = require('../models/Synagogue');
const { IMAGES_DIR } = require('./storage-paths');
const { sanitizeHexColor } = require('./admin-theme');
const { BOARD_THEME_DEFAULTS } = require('./board-defaults');
const { normalizeFontScales, normalizeTileOpacity, normalizeLogoBorderRadius, parseFontScalesFromBody } = require('./theme-typography');
const {
  normalizeMemorialQrPanel,
  memorialQrPanelToUpdate,
  parseMemorialQrPanelFromBody,
} = require('./memorial-qr-panel');
const {
  bakeTypographySnapshotFromBody,
  memorialQrPanelBaselinesToUpdate,
  normalizeFontScaleBaselines,
} = require('./typography-baseline');
const { normalizeCandlePalette } = require('./candle-palette');
const { generateSavedViewThumbnail } = require('./saved-view-thumbnail');
const { normalizeBoardFeatures, parseBoardFeaturesFromBody } = require('./board-features');
const { normalizePublicSubmission, parsePublicSubmissionFromBody } = require('./public-submission');
const { normalizeBoardFont } = require('./board-fonts');
const { normalizeThemeBorders } = require('./theme-borders');
const { pickDesignFromSnapshot, buildDesignApplyUpdate } = require('./saved-view-design');

const SAVED_VIEWS_DIR = path.join(IMAGES_DIR, 'saved-views');

function ensureSavedViewsDir() {
  if (!fs.existsSync(SAVED_VIEWS_DIR)) {
    fs.mkdirSync(SAVED_VIEWS_DIR, { recursive: true });
  }
}

function readBoardFeaturesFromBody(body, synagogue) {
  if (body.boardFeatures && typeof body.boardFeatures === 'object') {
    return normalizeBoardFeatures(body.boardFeatures);
  }

  const hasFeatureFields = Object.keys(body || {}).some((key) => key.indexOf('feature_') === 0);
  if (hasFeatureFields) {
    return parseBoardFeaturesFromBody(body);
  }

  return normalizeBoardFeatures(synagogue?.boardFeatures);
}

function readPublicSubmissionSnapshot(body, synagogue) {
  const current = normalizePublicSubmission(synagogue?.publicSubmission, synagogue?.provisioning);
  const source = body.publicSubmission && typeof body.publicSubmission === 'object'
    ? body.publicSubmission
    : body;

  const enabled = 'publicSubmissionEnabled' in source
    ? source.publicSubmissionEnabled === '1' || source.publicSubmissionEnabled === true || source.publicSubmissionEnabled === 'on'
    : ('enabled' in source ? !!source.enabled : current.enabled);

  const donationUrl = 'publicSubmissionDonationUrl' in source
    ? String(source.publicSubmissionDonationUrl || '').trim()
    : ('donationUrl' in source ? String(source.donationUrl || '').trim() : current.donationUrl);

  const parsedFlags = parsePublicSubmissionFromBody(source);
  const showDonationQr = parsedFlags.showDonationQr !== undefined
    ? parsedFlags.showDonationQr
    : ('showDonationQr' in source ? source.showDonationQr !== false : current.showDonationQr);
  const showRegistrationQr = parsedFlags.showRegistrationQr !== undefined
    ? parsedFlags.showRegistrationQr
    : ('showRegistrationQr' in source ? source.showRegistrationQr !== false : current.showRegistrationQr);

  return {
    enabled,
    donationUrl,
    donationQrImage: String(source.donationQrImage || current.donationQrImage || '').trim(),
    registrationQrImage: String(source.registrationQrImage || current.registrationQrImage || '').trim(),
    showDonationQr,
    showRegistrationQr,
  };
}

function normalizeSnapshot(body, synagogue) {
  const boardTitleText = String(body.boardTitleText ?? '').trim();
  const titles = {
    ru: String(body.titleRu ?? body.titles?.ru ?? '').trim(),
    en: String(body.titleEn ?? body.titles?.en ?? '').trim(),
    he: String(body.titleHe ?? body.titles?.he ?? '').trim(),
  };

  const bakedTypography = bakeTypographySnapshotFromBody(body, synagogue);
  const boardFeatures = readBoardFeaturesFromBody(body, synagogue);
  const publicSubmission = readPublicSubmissionSnapshot(body, synagogue);
  const shabbatTimesEnabled = 'shabbatTimesEnabled' in body
    ? body.shabbatTimesEnabled === '1' || body.shabbatTimesEnabled === true || body.shabbatTimesEnabled === 'on'
    : !!synagogue?.shabbatTimesEnabled;

  return {
    titles,
    boardTitleText,
    language: String(body.language || synagogue?.language || 'ru'),
    theme: {
      primaryColor: sanitizeHexColor(body.primaryColor, BOARD_THEME_DEFAULTS.primaryColor),
      textColor: sanitizeHexColor(body.textColor, BOARD_THEME_DEFAULTS.textColor),
      accentColor: sanitizeHexColor(body.accentColor, BOARD_THEME_DEFAULTS.accentColor),
      tileColor: sanitizeHexColor(body.tileColor, BOARD_THEME_DEFAULTS.tileColor),
      tileOpacity: normalizeTileOpacity(body.tileOpacity),
      ...normalizeThemeBorders({
        panelBorderColor: body.panelBorderColor ?? synagogue?.theme?.panelBorderColor,
        panelBorderOpacity: body.panelBorderOpacity ?? synagogue?.theme?.panelBorderOpacity,
        panelBorderRadius: body.panelBorderRadius ?? synagogue?.theme?.panelBorderRadius,
        panelBorderWidth: body.panelBorderWidth ?? synagogue?.theme?.panelBorderWidth,
        tileBorderColor: body.tileBorderColor ?? synagogue?.theme?.tileBorderColor,
        tileBorderOpacity: body.tileBorderOpacity ?? synagogue?.theme?.tileBorderOpacity,
        tileBorderRadius: body.tileBorderRadius ?? synagogue?.theme?.tileBorderRadius,
        tileBorderWidth: body.tileBorderWidth ?? synagogue?.theme?.tileBorderWidth,
      }),
      fontScales: bakedTypography.fontScales,
      fontScaleBaselines: bakedTypography.fontScaleBaselines,
      logo: body.logo || synagogue?.theme?.logo || '',
      logoBorderRadius: normalizeLogoBorderRadius(
        body.logoBorderRadius != null ? body.logoBorderRadius : synagogue?.theme?.logoBorderRadius,
      ),
      backgroundImage: body.backgroundImage || synagogue?.theme?.backgroundImage || '',
      tilesBackground: body.tilesBackground || synagogue?.theme?.tilesBackground || '',
      candlePalette: normalizeCandlePalette(body.candlePalette || synagogue?.theme?.candlePalette),
      boardFont: normalizeBoardFont(body.boardFont ?? synagogue?.theme?.boardFont),
    },
    memorialQrPanel: parseMemorialQrPanelFromBody(body, bakedTypography.memorialQrPanel || synagogue?.memorialQrPanel),
    boardFeatures,
    shabbatTimesEnabled,
    publicSubmission,
  };
}

async function saveViewThumbnail(snapshot, screenshotDataUrl) {
  const savedFromClient = await saveScreenshotFromDataUrl(screenshotDataUrl);
  if (savedFromClient) {
    return savedFromClient;
  }

  const filename = `view-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.jpg`;
  return generateSavedViewThumbnail(snapshot, filename);
}

async function saveScreenshotFromDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return '';
  }

  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
  if (!match) {
    return '';
  }

  ensureSavedViewsDir();
  const rawBuffer = Buffer.from(match[2], 'base64');
  const { optimizeImageBuffer } = require('./image-optimize');
  const optimized = await optimizeImageBuffer(rawBuffer, 'photo');
  const ext = optimized ? optimized.ext : (match[1] === 'png' ? '.png' : '.jpg');
  const filename = `view-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
  const filePath = path.join(SAVED_VIEWS_DIR, filename);
  fs.writeFileSync(filePath, optimized ? optimized.buffer : rawBuffer);
  return `saved-views/${filename}`;
}

function deleteScreenshot(relativePath) {
  if (!relativePath || !relativePath.startsWith('saved-views/')) {
    return;
  }

  const filePath = path.join(IMAGES_DIR, relativePath);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function buildApplyUpdate(snapshot) {
  return buildDesignApplyUpdate(snapshot);
}

function extractSnapshot(view) {
  if (!view || typeof view !== 'object') {
    return {};
  }

  if (view.snapshot && typeof view.snapshot === 'object' && Object.keys(view.snapshot).length > 0) {
    return view.snapshot;
  }

  if (view.theme || view.titles || view.memorialQrPanel || view.language) {
    return {
      titles: view.titles || {},
      language: view.language || 'ru',
      theme: view.theme || {},
      memorialQrPanel: view.memorialQrPanel,
      boardFeatures: view.boardFeatures,
      shabbatTimesEnabled: view.shabbatTimesEnabled,
      publicSubmission: view.publicSubmission,
    };
  }

  return {};
}

function readSavedViewId(view) {
  if (!view || typeof view !== 'object') {
    return '';
  }

  const raw = view.toObject ? view.toObject() : view;
  return String(raw.id || raw.viewId || raw._id || '').trim();
}

function readSavedViewName(view, index = 0) {
  if (!view || typeof view !== 'object') {
    return '';
  }

  const raw = view.toObject ? view.toObject() : view;
  const snapshot = extractSnapshot(raw);
  const titleFromSnapshot = String(
    snapshot.titles?.ru || snapshot.titles?.he || snapshot.titles?.en || '',
  ).trim();

  return String(raw.name || raw.title || raw.label || titleFromSnapshot || '').trim()
    || `View ${index + 1}`;
}

function normalizeSavedViewEntry(view, index = 0) {
  if (!view || typeof view !== 'object') {
    return null;
  }

  const raw = view.toObject ? view.toObject() : view;
  const snapshot = extractSnapshot(raw);
  const screenshot = raw.screenshot ? String(raw.screenshot) : '';
  const hasSnapshot = snapshot && Object.keys(snapshot).length > 0;
  const id = readSavedViewId(raw) || crypto.randomUUID();
  const name = readSavedViewName(raw, index);

  if (!hasSnapshot && !screenshot && !readSavedViewId(raw) && !String(raw.name || raw.title || raw.label || '').trim()) {
    return null;
  }

  return {
    id,
    name,
    savedAt: raw.savedAt || raw.createdAt || new Date(),
    screenshot,
    snapshot: snapshot || {},
  };
}

function normalizeSavedViews(savedViews) {
  return (savedViews || [])
    .map((view, index) => normalizeSavedViewEntry(view, index))
    .filter(Boolean);
}

function savedViewsNeedRepair(savedViews) {
  const list = savedViews || [];
  const normalized = normalizeSavedViews(list);

  if (normalized.length !== list.length) {
    return true;
  }

  return list.some((view, index) => {
    const raw = view && view.toObject ? view.toObject() : view;
    const id = String(raw?.id || '').trim();
    const name = String(raw?.name || '').trim();
    if (!id || !name) {
      return true;
    }

    if ((raw?.theme || raw?.titles || raw?.memorialQrPanel) && (!raw?.snapshot || !Object.keys(raw.snapshot).length)) {
      return true;
    }

    const repaired = normalized[index];
    if (!repaired) {
      return true;
    }

    return repaired.id !== id || repaired.name !== name;
  });
}

function findSavedView(savedViews, viewId) {
  const target = String(viewId || '').trim();
  if (!target) {
    return null;
  }

  return normalizeSavedViews(savedViews).find((entry) => entry.id === target) || null;
}

async function repairSavedViewsInDb(slug) {
  if (!slug) {
    return false;
  }

  const synagogue = await Synagogue.findOne({ slug }).lean();
  if (!synagogue || !savedViewsNeedRepair(synagogue.savedViews)) {
    return false;
  }

  const savedViews = normalizeSavedViews(synagogue.savedViews);
  const activeSavedViewId = savedViews.some((entry) => entry.id === synagogue.activeSavedViewId)
    ? synagogue.activeSavedViewId
    : '';

  await Synagogue.updateOne(
    { slug },
    { $set: { savedViews, activeSavedViewId } },
    { runValidators: false },
  );

  return true;
}

function serializeSavedViews(savedViews) {
  return normalizeSavedViews(savedViews);
}

function designOnlySnapshot(snapshot) {
  return pickDesignFromSnapshot(snapshot);
}

module.exports = {
  designOnlySnapshot,
  normalizeSnapshot,
  saveScreenshotFromDataUrl,
  saveViewThumbnail,
  deleteScreenshot,
  buildApplyUpdate,
  extractSnapshot,
  readSavedViewId,
  readSavedViewName,
  normalizeSavedViewEntry,
  normalizeSavedViews,
  savedViewsNeedRepair,
  findSavedView,
  repairSavedViewsInDb,
  serializeSavedViews,
};
