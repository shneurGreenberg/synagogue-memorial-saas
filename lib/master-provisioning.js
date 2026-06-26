const path = require('path');
const fs = require('fs');
const { normalizeBoardFeatures } = require('./board-features');
const { normalizeAdminLang } = require('./admin-locale');

const PROVISIONING_DIR = path.join(__dirname, '..', 'provisioning');

const WIZARD_STEPS = [
  'basics',
  'languages',
  'location',
  'logo',
  'donation',
  'appearance',
  'features',
  'contacts',
  'photos',
  'yahrzeit',
];

function ensureProvisioningDir(slug) {
  const dir = path.join(PROVISIONING_DIR, slug);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function parseSkippedSteps(body) {
  const raw = body.skippedSteps;
  if (!raw) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw.filter((step) => WIZARD_STEPS.includes(step));
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((step) => WIZARD_STEPS.includes(step)) : [];
  } catch {
    return String(raw)
      .split(',')
      .map((step) => step.trim())
      .filter((step) => WIZARD_STEPS.includes(step));
  }
}

function parseCheckbox(body, key) {
  return body[key] === '1' || body[key] === 'on' || body[key] === true;
}

function parseBoardFeaturesFromWizard(body) {
  const raw = {};

  Object.keys(normalizeBoardFeatures({})).forEach((key) => {
    if (body[`feature_${key}`] != null) {
      raw[key] = parseCheckbox(body, `feature_${key}`);
    }
  });

  return normalizeBoardFeatures(raw);
}

function parseTitles(body) {
  return {
    ru: String(body.titleRu || '').trim(),
    en: String(body.titleEn || '').trim(),
    he: String(body.titleHe || '').trim(),
  };
}

function parseThemeFromWizard(body) {
  const theme = {};

  const primaryColor = String(body.primaryColor || '').trim();
  const textColor = String(body.textColor || '').trim();
  const accentColor = String(body.accentColor || '').trim();
  const tileColor = String(body.tileColor || '').trim();
  const tileOpacity = Number(body.tileOpacity);

  if (primaryColor) theme.primaryColor = primaryColor;
  if (textColor) theme.textColor = textColor;
  if (accentColor) theme.accentColor = accentColor;
  if (tileColor) theme.tileColor = tileColor;
  if (Number.isFinite(tileOpacity) && tileOpacity >= 0 && tileOpacity <= 100) {
    theme.tileOpacity = Math.round(tileOpacity);
  }

  return theme;
}

function moveUploadedFile(file, slug, prefix) {
  if (!file || !file.path) {
    return null;
  }

  const dir = ensureProvisioningDir(slug);
  const ext = path.extname(file.originalname || '') || path.extname(file.filename || '');
  const storedName = `${prefix}-${Date.now()}${ext}`;
  const targetPath = path.join(dir, storedName);

  fs.renameSync(file.path, targetPath);

  return {
    originalName: file.originalname || storedName,
    storedName,
    mimeType: file.mimetype || 'application/octet-stream',
    size: file.size || 0,
    relativePath: path.posix.join('provisioning', slug, storedName),
  };
}

function buildProvisioningPayload(body, files, slug) {
  const skippedSteps = parseSkippedSteps(body);
  const contactFiles = [];

  if (!skippedSteps.includes('contacts')) {
    (files.contactFiles || []).forEach((file, index) => {
      const saved = moveUploadedFile(file, slug, `contact-${index + 1}`);
      if (saved) {
        contactFiles.push({
          originalName: saved.originalName,
          storedName: saved.storedName,
          mimeType: saved.mimeType,
          size: saved.size,
        });
      }
    });
  }

  let donationQrImage = '';
  if (!skippedSteps.includes('donation')) {
    const donationQrFile = files.donationQrImage && files.donationQrImage[0];
    if (donationQrFile) {
      const saved = moveUploadedFile(donationQrFile, slug, 'donation-qr');
      if (saved) {
        donationQrImage = saved.relativePath;
      }
    }
  }

  return {
    photosDriveUrl: skippedSteps.includes('photos')
      ? ''
      : String(body.photosDriveUrl || '').trim(),
    contactFiles,
    donationQrImage,
    notes: skippedSteps.includes('yahrzeit')
      ? ''
      : String(body.provisioningNotes || '').trim(),
    skippedSteps,
    createdAt: new Date(),
  };
}

function buildSynagoguePayloadFromWizard(body, files, slug) {
  const skippedSteps = parseSkippedSteps(body);
  const provisioning = buildProvisioningPayload(body, files, slug);

  const payload = {
    name: String(body.name || '').trim(),
    slug,
    title: String(body.name || '').trim(),
    language: normalizeAdminLang(body.language || 'ru'),
    adminLanguage: normalizeAdminLang(body.adminLanguage || body.language || 'ru'),
    publicSubmission: {
      enabled: skippedSteps.includes('features')
        ? false
        : parseCheckbox(body, 'publicSubmissionEnabled'),
      donationUrl: skippedSteps.includes('donation')
        ? ''
        : String(body.donationUrl || '').trim(),
    },
    yahrzeitReminders: {
      enabled: skippedSteps.includes('yahrzeit')
        ? false
        : parseCheckbox(body, 'yahrzeitRemindersEnabled'),
      includeHebrewYahrzeit: body.yahrzeitIncludeHebrew !== '0',
      notifyEmail: skippedSteps.includes('yahrzeit')
        ? ''
        : String(body.yahrzeitNotifyEmail || '').trim(),
    },
    shabbatTimesEnabled: skippedSteps.includes('features')
      ? false
      : parseCheckbox(body, 'shabbatTimesEnabled'),
    provisioning,
  };

  if (!skippedSteps.includes('languages')) {
    payload.titles = parseTitles(body);
  }

  if (!skippedSteps.includes('features')) {
    payload.boardFeatures = parseBoardFeaturesFromWizard(body);
  }

  if (!skippedSteps.includes('appearance')) {
    const theme = parseThemeFromWizard(body);
    if (Object.keys(theme).length > 0) {
      payload.theme = theme;
    }
  }

  if (!skippedSteps.includes('logo') && files.logo && files.logo[0]) {
    payload._logoFile = files.logo[0];
  }

  return payload;
}

module.exports = {
  WIZARD_STEPS,
  PROVISIONING_DIR,
  ensureProvisioningDir,
  parseSkippedSteps,
  buildSynagoguePayloadFromWizard,
  buildProvisioningPayload,
};
