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

  const missing = [];
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'secret') {
    missing.push('SESSION_SECRET');
  }
  if (!process.env.MASTER_ADMIN_PASSWORD || process.env.MASTER_ADMIN_PASSWORD === 'master') {
    missing.push('MASTER_ADMIN_PASSWORD');
  }

  if (missing.length) {
    throw new Error(
      `Refusing to start in production without secure env vars: ${missing.join(', ')}`,
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
