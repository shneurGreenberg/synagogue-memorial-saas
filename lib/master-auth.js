const { hashPassword, verifyPassword } = require('./password');

const BCRYPT_PREFIX = '$2';

function getConfiguredMasterPassword() {
  // Preserve legacy default so existing production deploys keep working.
  // assertProductionSecrets() warns loudly when this fallback is used in production.
  return process.env.MASTER_ADMIN_PASSWORD || 'master';
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
