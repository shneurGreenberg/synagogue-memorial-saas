const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { communityPublicPath } = require('./public-base-url');
const { IMAGES_DIR } = require('./storage-paths');
const { parseDonationUrl, normalizePublicSubmission } = require('./public-submission');
const { optimizeImageBuffer } = require('./image-optimize');

const AUTO_QR_DIR = 'community-qr';

function autoRegistrationQrRelativePath(slug) {
  return path.posix.join(AUTO_QR_DIR, `${slug}-add-name.png`);
}

function autoDonationQrRelativePath(slug) {
  return path.posix.join(AUTO_QR_DIR, `${slug}-donation.png`);
}

function resolveAddNameQrUrl(slug, env = process.env) {
  return communityPublicPath(slug, 'add-name', env);
}

function resolveDonationQrTargetUrl(slug, donationUrl, env = process.env) {
  const link = String(donationUrl || '').trim();
  if (link) {
    return parseDonationUrl(link);
  }
  return communityPublicPath(slug, 'donation-setup', env);
}

function isAutoRegistrationQrImage(slug, imagePath) {
  const value = String(imagePath || '').trim();
  return value === autoRegistrationQrRelativePath(slug);
}

function isAutoDonationQrImage(slug, imagePath) {
  const value = String(imagePath || '').trim();
  return value === autoDonationQrRelativePath(slug);
}

function communityHasAnyQrSet(publicSubmission) {
  const source = publicSubmission || {};
  return Boolean(
    String(source.registrationQrImage || '').trim()
    || String(source.donationQrImage || '').trim(),
  );
}

function communityShowsRegistrationBarcodeOnBoard(publicSubmission) {
  const source = publicSubmission || {};
  return source.showRegistrationQr !== false;
}

function communityShowsDonationBarcodeOnBoard(publicSubmission) {
  const source = publicSubmission || {};
  if (source.showDonationQr === false) {
    return false;
  }
  return Boolean(
    String(source.donationQrImage || '').trim()
    || String(source.donationUrl || '').trim(),
  );
}

function communityShowsBarcodesOnBoard(publicSubmission, provisioning) {
  const normalized = normalizePublicSubmission(publicSubmission, provisioning);
  return communityShowsRegistrationBarcodeOnBoard(normalized)
    || communityShowsDonationBarcodeOnBoard(normalized);
}

function parseAutoCommunityQrFilename(filename) {
  const base = String(filename || '').trim();
  const match = /^(.+)-(add-name|donation)\.png$/i.exec(base);
  if (!match) {
    return null;
  }
  const kind = match[2].toLowerCase() === 'add-name' ? 'registration' : 'donation';
  return { slug: match[1], kind };
}

function planDefaultCommunityQrBackfill(synagogue) {
  const slug = String(synagogue?.slug || '').trim();
  if (!slug) {
    return null;
  }

  const publicSubmission = synagogue.publicSubmission || {};
  const normalized = normalizePublicSubmission(publicSubmission, synagogue.provisioning);

  const planned = {};
  const registrationQrImage = String(publicSubmission.registrationQrImage || '').trim();
  if (!registrationQrImage && !communityShowsRegistrationBarcodeOnBoard(normalized)) {
    planned.registrationQrImage = autoRegistrationQrRelativePath(slug);
  }

  const donationQrImage = String(publicSubmission.donationQrImage || '').trim();
  if (!donationQrImage && !communityShowsDonationBarcodeOnBoard(normalized)) {
    planned.donationQrImage = autoDonationQrRelativePath(slug);
  }

  return Object.keys(planned).length ? planned : null;
}

function ensureQrDir() {
  const dir = path.join(IMAGES_DIR, AUTO_QR_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

async function writeQrPngForUrl(url, relativePath) {
  ensureQrDir();
  const pngBuffer = await QRCode.toBuffer(String(url), {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 512,
  });
  const optimized = await optimizeImageBuffer(pngBuffer, 'qr');
  const fullPath = path.join(IMAGES_DIR, ...relativePath.split('/'));
  const outputBuffer = optimized?.buffer || pngBuffer;
  fs.writeFileSync(fullPath, outputBuffer);
  return relativePath;
}

async function ensureRegistrationQrImage(slug, currentPath, env = process.env) {
  const existing = String(currentPath || '').trim();
  if (existing && !isAutoRegistrationQrImage(slug, existing)) {
    return existing;
  }
  const targetUrl = resolveAddNameQrUrl(slug, env);
  return writeQrPngForUrl(targetUrl, autoRegistrationQrRelativePath(slug));
}

async function ensureDonationQrImage(slug, donationUrl, currentPath, env = process.env) {
  const existing = String(currentPath || '').trim();
  if (existing && !isAutoDonationQrImage(slug, existing)) {
    return existing;
  }
  const targetUrl = resolveDonationQrTargetUrl(slug, donationUrl, env);
  return writeQrPngForUrl(targetUrl, autoDonationQrRelativePath(slug));
}

async function applyDefaultCommunityQrToDocument(synagogue, options = {}) {
  const slug = String(synagogue.slug || '').trim();
  if (!slug) {
    return synagogue;
  }

  const env = options.env || process.env;
  const skipIfAnyQr = options.skipIfAnyQr === true;
  const publicSubmission = synagogue.publicSubmission || {};

  if (skipIfAnyQr && communityHasAnyQrSet(publicSubmission)) {
    return synagogue;
  }

  if (!synagogue.publicSubmission) {
    synagogue.publicSubmission = {};
  }

  const registrationQrImage = await ensureRegistrationQrImage(
    slug,
    publicSubmission.registrationQrImage,
    env,
  );
  const donationQrImage = await ensureDonationQrImage(
    slug,
    publicSubmission.donationUrl,
    publicSubmission.donationQrImage,
    env,
  );

  synagogue.publicSubmission.registrationQrImage = registrationQrImage;
  synagogue.publicSubmission.donationQrImage = donationQrImage;
  if (synagogue.publicSubmission.showDonationQr === undefined) {
    synagogue.publicSubmission.showDonationQr = true;
  }
  if (synagogue.publicSubmission.showRegistrationQr === undefined) {
    synagogue.publicSubmission.showRegistrationQr = true;
  }

  return synagogue;
}

async function syncAutoDonationQrAfterUrlChange(synagogue, env = process.env) {
  const slug = String(synagogue.slug || '').trim();
  if (!slug) {
    return null;
  }
  const current = String(synagogue.publicSubmission?.donationQrImage || '').trim();
  if (current && !isAutoDonationQrImage(slug, current)) {
    return current;
  }
  const donationUrl = String(synagogue.publicSubmission?.donationUrl || '').trim();
  return ensureDonationQrImage(slug, donationUrl, current, env);
}

module.exports = {
  AUTO_QR_DIR,
  autoRegistrationQrRelativePath,
  autoDonationQrRelativePath,
  resolveAddNameQrUrl,
  resolveDonationQrTargetUrl,
  isAutoRegistrationQrImage,
  isAutoDonationQrImage,
  communityHasAnyQrSet,
  communityShowsRegistrationBarcodeOnBoard,
  communityShowsDonationBarcodeOnBoard,
  communityShowsBarcodesOnBoard,
  parseAutoCommunityQrFilename,
  planDefaultCommunityQrBackfill,
  applyDefaultCommunityQrToDocument,
  syncAutoDonationQrAfterUrlChange,
  writeQrPngForUrl,
};
