const bcrypt = require('bcryptjs');

const BCRYPT_PREFIX = '$2';

async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

async function verifyPassword(plain, stored) {
  if (!stored) {
    return false;
  }

  if (stored.startsWith(BCRYPT_PREFIX)) {
    return bcrypt.compare(plain, stored);
  }

  if (process.env.NODE_ENV === 'production') {
    console.warn('Rejecting legacy plaintext password comparison in production');
    return false;
  }

  console.warn('Legacy plaintext password detected; it will be upgraded on successful login');
  return plain === stored;
}

async function ensureHashed(plain, stored) {
  if (stored && stored.startsWith(BCRYPT_PREFIX)) {
    return null;
  }

  if (plain && (await verifyPassword(plain, stored))) {
    return hashPassword(plain);
  }

  return null;
}

module.exports = {
  hashPassword,
  verifyPassword,
  ensureHashed,
};
