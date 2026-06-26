const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Synagogue = require('../models/Synagogue');
const { IMAGES_DIR } = require('./storage-paths');
const { sanitizeHexColor } = require('./admin-theme');
const { BOARD_THEME_DEFAULTS } = require('./board-defaults');
const { normalizeFontScales, normalizeTileOpacity, parseFontScalesFromBody } = require('./theme-typography');
const { normalizeMemorialQrPanel, MEMORIAL_QR_DEFAULTS } = require('./memorial-qr-panel');
const {
  bakeTypographySnapshotFromBody,
  memorialQrPanelBaselinesToUpdate,
  normalizeFontScaleBaselines,
} = require('./typography-baseline');
const { normalizeCandlePalette } = require('./candle-palette');
const { generateSavedViewThumbnail } = require('./saved-view-thumbnail');

const SAVED_VIEWS_DIR = path.join(IMAGES_DIR, 'saved-views');

function ensureSavedViewsDir() {
  if (!fs.existsSync(SAVED_VIEWS_DIR)) {
    fs.mkdirSync(SAVED_VIEWS_DIR, { recursive: true });
  }
}

function normalizeSnapshot(body, synagogue) {
  const titles = {
    ru: String(body.titleRu ?? body.titles?.ru ?? '').trim(),
    en: String(body.titleEn ?? body.titles?.en ?? '').trim(),
    he: String(body.titleHe ?? body.titles?.he ?? '').trim(),
  };

  const bakedTypography = bakeTypographySnapshotFromBody(body, synagogue);

  return {
    titles,
    language: String(body.language || 'ru'),
    theme: {
      primaryColor: sanitizeHexColor(body.primaryColor, BOARD_THEME_DEFAULTS.primaryColor),
      textColor: sanitizeHexColor(body.textColor, BOARD_THEME_DEFAULTS.textColor),
      accentColor: sanitizeHexColor(body.accentColor, BOARD_THEME_DEFAULTS.accentColor),
      tileColor: sanitizeHexColor(body.tileColor, BOARD_THEME_DEFAULTS.tileColor),
      tileOpacity: normalizeTileOpacity(body.tileOpacity),
      fontScales: bakedTypography.fontScales,
      fontScaleBaselines: bakedTypography.fontScaleBaselines,
      logo: body.logo || '',
      backgroundImage: body.backgroundImage || '',
      tilesBackground: body.tilesBackground || '',
      candlePalette: normalizeCandlePalette(body.candlePalette || synagogue?.theme?.candlePalette),
    },
    memorialQrPanel: normalizeMemorialQrPanel(bakedTypography.memorialQrPanel || {
      titles: MEMORIAL_QR_DEFAULTS.titles,
      texts: MEMORIAL_QR_DEFAULTS.texts,
      titleScale: body.memorialQrTitleScale,
      textScale: body.memorialQrTextScale,
      qrScale: body.memorialQrQrScale,
    }),
  };
}

async function saveViewThumbnail(snapshot, screenshotDataUrl) {
  const savedFromClient = saveScreenshotFromDataUrl(screenshotDataUrl);
  if (savedFromClient) {
    return savedFromClient;
  }

  const filename = `view-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.jpg`;
  return generateSavedViewThumbnail(snapshot, filename);
}

function saveScreenshotFromDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return '';
  }

  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
  if (!match) {
    return '';
  }

  ensureSavedViewsDir();
  const ext = match[1] === 'png' ? 'png' : 'jpg';
  const filename = `view-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  const filePath = path.join(SAVED_VIEWS_DIR, filename);
  fs.writeFileSync(filePath, Buffer.from(match[2], 'base64'));
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
  const update = {
    'titles.ru': snapshot.titles.ru,
    'titles.en': snapshot.titles.en,
    'titles.he': snapshot.titles.he,
    title: snapshot.titles.ru,
    language: snapshot.language,
    'theme.primaryColor': snapshot.theme.primaryColor,
    'theme.textColor': snapshot.theme.textColor,
    'theme.accentColor': snapshot.theme.accentColor,
    'theme.tileColor': snapshot.theme.tileColor,
    'theme.tileOpacity': normalizeTileOpacity(snapshot.theme.tileOpacity),
  };

  const fontScales = normalizeFontScales(snapshot.theme.fontScales);
  Object.entries(fontScales).forEach(([key, value]) => {
    update[`theme.fontScales.${key}`] = value;
  });

  const fontScaleBaselines = normalizeFontScaleBaselines(snapshot.theme.fontScaleBaselines);
  Object.entries(fontScaleBaselines).forEach(([key, value]) => {
    update[`theme.fontScaleBaselines.${key}`] = value;
  });

  if (snapshot.theme.logo) {
    update['theme.logo'] = snapshot.theme.logo;
  }
  if (snapshot.theme.backgroundImage) {
    update['theme.backgroundImage'] = snapshot.theme.backgroundImage;
  }
  if (snapshot.theme.tilesBackground) {
    update['theme.tilesBackground'] = snapshot.theme.tilesBackground;
  }
  update['theme.candlePalette'] = normalizeCandlePalette(snapshot.theme.candlePalette);

  if (snapshot.memorialQrPanel) {
    const panel = normalizeMemorialQrPanel(snapshot.memorialQrPanel);
    update['memorialQrPanel.titles.ru'] = panel.titles.ru;
    update['memorialQrPanel.titles.en'] = panel.titles.en;
    update['memorialQrPanel.titles.he'] = panel.titles.he;
    update['memorialQrPanel.texts.ru'] = panel.texts.ru;
    update['memorialQrPanel.texts.en'] = panel.texts.en;
    update['memorialQrPanel.texts.he'] = panel.texts.he;
    Object.assign(update, memorialQrPanelBaselinesToUpdate(panel));
  }

  return update;
}

function readSavedViewId(view) {
  if (!view || typeof view !== 'object') {
    return '';
  }

  return String(view.id || view.viewId || view._id || '').trim();
}

function readSavedViewName(view, index = 0) {
  if (!view || typeof view !== 'object') {
    return '';
  }

  return String(view.name || view.title || view.label || '').trim()
    || `View ${index + 1}`;
}

function normalizeSavedViewEntry(view, index = 0) {
  if (!view || typeof view !== 'object') {
    return null;
  }

  const snapshot = view.snapshot && typeof view.snapshot === 'object' ? view.snapshot : null;
  const screenshot = view.screenshot ? String(view.screenshot) : '';
  const id = readSavedViewId(view) || crypto.randomUUID();
  const name = readSavedViewName(view, index);

  if (!snapshot && !screenshot && !readSavedViewId(view) && !String(view.name || view.title || view.label || '').trim()) {
    return null;
  }

  return {
    id,
    name,
    savedAt: view.savedAt || view.createdAt || new Date(),
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

  if (list.length !== normalizeSavedViews(list).length) {
    return true;
  }

  return list.some((view, index) => {
    const normalized = normalizeSavedViewEntry(view, index);
    if (!normalized) {
      return true;
    }

    return readSavedViewId(view) !== normalized.id
      || String(view.name || '').trim() !== normalized.name;
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
  );

  return true;
}

function serializeSavedViews(savedViews) {
  return normalizeSavedViews(savedViews);
}

module.exports = {
  normalizeSnapshot,
  saveScreenshotFromDataUrl,
  saveViewThumbnail,
  deleteScreenshot,
  buildApplyUpdate,
  readSavedViewId,
  readSavedViewName,
  normalizeSavedViewEntry,
  normalizeSavedViews,
  savedViewsNeedRepair,
  findSavedView,
  repairSavedViewsInDb,
  serializeSavedViews,
};
