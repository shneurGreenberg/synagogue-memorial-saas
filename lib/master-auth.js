const { hashPassword, verifyPassword } = require('./password');

const BCRYPT_PREFIX = '$2';

function getConfiguredMasterPassword() {
  return process.env.MASTER_ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'master');
}

async function verifyMasterPassword(plain) {
  const configured = getConfiguredMasterPassword();
  if (!configured || !plain) {
    return false;
  }

  if (configured.startsWith(BCRYPT_PREFIX)) {
    return verifyPassword(plain, configured);
  }

  return plain === configured;
}

async function hashMasterPasswordForEnv(plain) {
  return hashPassword(plain);
}

module.exports = {
  getConfiguredMasterPassword,
  verifyMasterPassword,
  hashMasterPasswordForEnv,
};
