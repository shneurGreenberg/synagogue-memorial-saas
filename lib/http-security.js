const rateLimit = require('express-rate-limit');

function createLoginRateLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many login attempts. Please try again later.',
  });
}

function createPublicSubmissionRateLimiter() {
  return rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many submissions. Please try again later.',
  });
}

function createApiRateLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests' },
  });
}

function publicErrorMessage(err, fallback = 'Internal server error') {
  if (process.env.NODE_ENV === 'production') {
    return fallback;
  }

  return (err && err.message) || fallback;
}

function assertProductionSecrets() {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'secret') {
    console.error('!!! SECURITY WARNING !!! SESSION_SECRET is missing or insecure. Set a strong SESSION_SECRET in the hosting dashboard.');
  }

  // Keep the app bootable for existing Amvera deploys that still use the legacy
  // default, but make the risk highly visible in logs.
  if (!process.env.MASTER_ADMIN_PASSWORD || process.env.MASTER_ADMIN_PASSWORD === 'master') {
    console.error(
      '!!! SECURITY ERROR !!! SECURITY WARNING: MASTER_ADMIN_PASSWORD is missing or still set to the default "master". '
      + 'Set a strong password in the hosting dashboard as soon as possible.',
    );
  }
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) {
        return reject(err);
      }
      return resolve();
    });
  });
}

const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

function isAllowedImageUpload(file) {
  if (!file || !file.mimetype) {
    return false;
  }

  return ALLOWED_IMAGE_MIME.has(String(file.mimetype).toLowerCase());
}

function isAllowedCommunityLogoUpload(file) {
  if (!file || !file.mimetype) {
    return false;
  }

  const mime = String(file.mimetype).toLowerCase();
  return ALLOWED_IMAGE_MIME.has(mime) || mime === 'image/svg+xml';
}

// 1.33.0 audit #3: per-community backoff after repeated failed logins (in-memory, per process).
const slugFailures = new Map();
const SLUG_FREE_FAILS = 5;
const SLUG_MAX_LOCK_MS = 15 * 60 * 1000;

function slugLockRemainingMs(slug, now = Date.now()) {
  const rec = slugFailures.get(String(slug || '').toLowerCase());
  if (!rec || rec.count < SLUG_FREE_FAILS) return 0;
  const lock = Math.min(SLUG_MAX_LOCK_MS, 1000 * 2 ** (rec.count - SLUG_FREE_FAILS + 2));
  return Math.max(0, rec.last + lock - now);
}

function recordLoginFailure(slug, now = Date.now()) {
  const key = String(slug || '').toLowerCase();
  if (!key) return;
  const rec = slugFailures.get(key) || { count: 0, last: 0 };
  if (now - rec.last > SLUG_MAX_LOCK_MS * 2) rec.count = 0;
  rec.count += 1;
  rec.last = now;
  slugFailures.set(key, rec);
}

function recordLoginSuccess(slug) {
  slugFailures.delete(String(slug || '').toLowerCase());
}

module.exports = {
  slugLockRemainingMs,
  recordLoginFailure,
  recordLoginSuccess,
  createLoginRateLimiter,
  createPublicSubmissionRateLimiter,
  createApiRateLimiter,
  publicErrorMessage,
  assertProductionSecrets,
  regenerateSession,
  ALLOWED_IMAGE_MIME,
  isAllowedImageUpload,
  isAllowedCommunityLogoUpload,
};
