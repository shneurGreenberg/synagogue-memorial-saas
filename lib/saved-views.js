const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { IMAGES_DIR } = require('./storage-paths');
const { sanitizeHexColor } = require('./admin-theme');
const { BOARD_THEME_DEFAULTS } = require('./board-defaults');
const { normalizeFontScales, normalizeTileOpacity, parseFontScalesFromBody } = require('./theme-typography');
const { normalizeMemorialQrPanel } = require('./memorial-qr-panel');
const { generateSavedViewThumbnail } = require('./saved-view-thumbnail');

const SAVED_VIEWS_DIR = path.join(IMAGES_DIR, 'saved-views');

function ensureSavedViewsDir() {
  if (!fs.existsSync(SAVED_VIEWS_DIR)) {
    fs.mkdirSync(SAVED_VIEWS_DIR, { recursive: true });
  }
}

function normalizeSnapshot(body) {
  const titles = {
    ru: String(body.titleRu ?? body.titles?.ru ?? '').trim(),
    en: String(body.titleEn ?? body.titles?.en ?? '').trim(),
    he: String(body.titleHe ?? body.titles?.he ?? '').trim(),
  };

  return {
    titles,
    language: String(body.language || 'ru'),
    theme: {
      primaryColor: sanitizeHexColor(body.primaryColor, BOARD_THEME_DEFAULTS.primaryColor),
      textColor: sanitizeHexColor(body.textColor, BOARD_THEME_DEFAULTS.textColor),
      accentColor: sanitizeHexColor(body.accentColor, BOARD_THEME_DEFAULTS.accentColor),
      tileColor: sanitizeHexColor(body.tileColor, BOARD_THEME_DEFAULTS.tileColor),
      tileOpacity: normalizeTileOpacity(body.tileOpacity),
      fontScales: normalizeFontScales(body.fontScales || parseFontScalesFromBody(body)),
      logo: body.logo || '',
      backgroundImage: body.backgroundImage || '',
      tilesBackground: body.tilesBackground || '',
    },
    memorialQrPanel: normalizeMemorialQrPanel(body.memorialQrPanel || {
      titles: {
        ru: body.memorialQrTitleRu,
        en: body.memorialQrTitleEn,
        he: body.memorialQrTitleHe,
      },
      texts: {
        ru: body.memorialQrTextRu,
        en: body.memorialQrTextEn,
        he: body.memorialQrTextHe,
      },
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

  if (snapshot.theme.logo) {
    update['theme.logo'] = snapshot.theme.logo;
  }
  if (snapshot.theme.backgroundImage) {
    update['theme.backgroundImage'] = snapshot.theme.backgroundImage;
  }
  if (snapshot.theme.tilesBackground) {
    update['theme.tilesBackground'] = snapshot.theme.tilesBackground;
  }

  if (snapshot.memorialQrPanel) {
    const panel = normalizeMemorialQrPanel(snapshot.memorialQrPanel);
    update['memorialQrPanel.titles.ru'] = panel.titles.ru;
    update['memorialQrPanel.titles.en'] = panel.titles.en;
    update['memorialQrPanel.titles.he'] = panel.titles.he;
    update['memorialQrPanel.texts.ru'] = panel.texts.ru;
    update['memorialQrPanel.texts.en'] = panel.texts.en;
    update['memorialQrPanel.texts.he'] = panel.texts.he;
    update['memorialQrPanel.titleScale'] = panel.titleScale;
    update['memorialQrPanel.textScale'] = panel.textScale;
    update['memorialQrPanel.qrScale'] = panel.qrScale;
  }

  return update;
}

function serializeSavedViews(savedViews) {
  return (savedViews || []).map((view) => ({
    id: view.id,
    name: view.name,
    savedAt: view.savedAt,
    screenshot: view.screenshot || '',
    snapshot: view.snapshot || {},
  }));
}

module.exports = {
  normalizeSnapshot,
  saveScreenshotFromDataUrl,
  saveViewThumbnail,
  deleteScreenshot,
  buildApplyUpdate,
  serializeSavedViews,
};
