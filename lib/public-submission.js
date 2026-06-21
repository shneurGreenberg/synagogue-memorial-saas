const PUBLIC_SUBMISSION_DEFAULTS = {
  enabled: false,
  donationUrl: '',
};

function normalizePublicSubmission(raw) {
  const source = raw || {};

  return {
    enabled: source.enabled === true,
    donationUrl: String(source.donationUrl || '').trim(),
  };
}

function parseDonationUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) {
    return '';
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://${value}`;
}

function parseTruthyFormField(value) {
  if (Array.isArray(value)) {
    return value.some((entry) => entry === '1' || entry === 'on' || entry === true || entry === 1);
  }

  return value === '1' || value === 'on' || value === true || value === 1;
}

function hasPublicSubmissionFormFields(body) {
  if (!body) {
    return false;
  }

  return Object.prototype.hasOwnProperty.call(body, 'publicSubmissionEnabled')
    || Object.prototype.hasOwnProperty.call(body, 'publicSubmissionDonationUrl');
}

function parsePublicSubmissionFromBody(body) {
  return normalizePublicSubmission({
    enabled: parseTruthyFormField(body && body.publicSubmissionEnabled),
    donationUrl: parseDonationUrl(body && body.publicSubmissionDonationUrl),
  });
}

module.exports = {
  PUBLIC_SUBMISSION_DEFAULTS,
  normalizePublicSubmission,
  parseTruthyFormField,
  hasPublicSubmissionFormFields,
  parsePublicSubmissionFromBody,
  parseDonationUrl,
};
