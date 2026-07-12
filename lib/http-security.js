const rateLimit = require('express-rate-limit');

function createLoginRateLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
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
    throw new Error('Refusing to start in production without a secure SESSION_SECRET');
  }

  // Keep the app bootable for existing Amvera deploys that still use the legacy
  // default, but make the risk highly visible in logs.
  if (!process.env.MASTER_ADMIN_PASSWORD || process.env.MASTER_ADMIN_PASSWORD === 'master') {
    console.warn(
      'SECURITY WARNING: MASTER_ADMIN_PASSWORD is missing or still set to the default "master". '
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

module.exports = {
  createLoginRateLimiter,
  createPublicSubmissionRateLimiter,
  createApiRateLimiter,
  publicErrorMessage,
  assertProductionSecrets,
  regenerateSession,
  ALLOWED_IMAGE_MIME,
  isAllowedImageUpload,
};
