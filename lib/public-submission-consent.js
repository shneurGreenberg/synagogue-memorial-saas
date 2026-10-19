function parseDataConsentFromBody(body) {
  const raw = body && body.dataConsent;
  if (raw === '1' || raw === true || raw === 'on' || raw === 'yes') {
    return true;
  }
  return false;
}

function validateDataConsent(consent) {
  return consent === true;
}

function consentTimestamp() {
  return new Date();
}

module.exports = {
  parseDataConsentFromBody,
  validateDataConsent,
  consentTimestamp,
};
