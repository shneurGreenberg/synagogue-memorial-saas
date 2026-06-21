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

function parsePublicSubmissionFromBody(body) {
  return normalizePublicSubmission({
    enabled: body.publicSubmissionEnabled === '1' || body.publicSubmissionEnabled === 'on',
    donationUrl: parseDonationUrl(body.publicSubmissionDonationUrl),
  });
}

module.exports = {
  PUBLIC_SUBMISSION_DEFAULTS,
  normalizePublicSubmission,
  parsePublicSubmissionFromBody,
  parseDonationUrl,
};
