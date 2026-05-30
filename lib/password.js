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
