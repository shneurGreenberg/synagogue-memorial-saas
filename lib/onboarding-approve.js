const path = require('path');
const fs = require('fs');
const Synagogue = require('../models/Synagogue');
const { normalizeSlug, isValidSlug } = require('./normalize-slug');
const { IMAGES_DIR } = require('./storage-paths');
const { normalizeAdminLang } = require('./admin-locale');
const { normalizeLogoBackground } = require('./theme-typography');

const PENDING_LOGO_DIR = path.join(IMAGES_DIR, 'onboarding-pending');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function movePendingLogo(filename) {
  if (!filename) {
    return '';
  }

  const pendingPath = path.join(PENDING_LOGO_DIR, path.basename(filename));
  if (!fs.existsSync(pendingPath)) {
    return filename;
  }

  ensureDir(IMAGES_DIR);
  const targetName = path.basename(filename);
  const targetPath = path.join(IMAGES_DIR, targetName);
  fs.renameSync(pendingPath, targetPath);
  return targetName;
}

async function createSynagogueFromOnboardingRequest(request) {
  const slug = normalizeSlug(request.slug);
  const name = String(request.name || '').trim();

  if (!name || !slug || !isValidSlug(slug)) {
    throw new Error('invalid_slug');
  }

  const existing = await Synagogue.findOne({ slug });
  if (existing) {
    throw new Error('slug_exists');
  }

  if (!request.adminPasswordHash) {
    throw new Error('missing_password');
  }

  const logo = movePendingLogo(request.logoFilename);
  const titles = request.titles || {};
  const synagogue = new Synagogue({
    name,
    slug,
    title: name,
    adminPassword: request.adminPasswordHash,
    titles: {
      en: String(titles.en || name).trim(),
      he: String(titles.he || '').trim(),
      ru: String(titles.ru || '').trim(),
    },
    location: {
      lat: request.location?.lat ?? 54.9833,
      long: request.location?.long ?? 82.8964,
      city: String(request.location?.city || '').trim() || 'Community',
      timezone: String(request.location?.timezone || 'UTC').trim(),
    },
    language: normalizeAdminLang(request.boardLanguage || 'en'),
    adminLanguage: normalizeAdminLang(request.adminLanguage || request.boardLanguage || 'en'),
    provisioning: {
      notes: [
        request.notes,
        request.contactName ? `Contact: ${request.contactName}` : '',
        request.contactPhone ? `Phone: ${request.contactPhone}` : '',
        request.adminEmail ? `Email: ${request.adminEmail}` : '',
      ].filter(Boolean).join('\n'),
      createdAt: new Date(),
    },
    theme: {},
  });

  if (logo) {
    synagogue.theme.logo = logo;
  }
  const logoBackground = normalizeLogoBackground(request.logoBackground);
  if (logoBackground) {
    synagogue.theme.logoBackground = logoBackground;
  }

  await synagogue.save();
  return synagogue;
}

module.exports = {
  PENDING_LOGO_DIR,
  createSynagogueFromOnboardingRequest,
  movePendingLogo,
};
