const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { IMAGES_DIR } = require('./storage-paths');
const { sanitizeHexColor } = require('./admin-theme');
const { BOARD_THEME_DEFAULTS } = require('./board-defaults');

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
      logo: body.logo || '',
      backgroundImage: body.backgroundImage || '',
      tilesBackground: body.tilesBackground || '',
    },
  };
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
  };

  if (snapshot.theme.logo) {
    update['theme.logo'] = snapshot.theme.logo;
  }
  if (snapshot.theme.backgroundImage) {
    update['theme.backgroundImage'] = snapshot.theme.backgroundImage;
  }
  if (snapshot.theme.tilesBackground) {
    update['theme.tilesBackground'] = snapshot.theme.tilesBackground;
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
  deleteScreenshot,
  buildApplyUpdate,
  serializeSavedViews,
};
