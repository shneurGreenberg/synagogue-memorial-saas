const PUBLIC_SUBMISSION_DEFAULTS = {
  enabled: false,
  donationUrl: '',
  donationQrImage: '',
  registrationQrImage: '',
};

function normalizePublicSubmission(raw, provisioning) {
  const source = raw || {};
  const provisioningQr = provisioning && provisioning.donationQrImage
    ? String(provisioning.donationQrImage).trim()
    : '';

  return {
    enabled: source.enabled === true,
    donationUrl: String(source.donationUrl || '').trim(),
    donationQrImage: String(source.donationQrImage || provisioningQr || '').trim(),
    registrationQrImage: String(source.registrationQrImage || '').trim(),
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
  const source = body || {};
  const parsed = {};

  if ('publicSubmissionEnabled' in source) {
    parsed.enabled = source.publicSubmissionEnabled === '1' || source.publicSubmissionEnabled === 'on';
  }
  if ('publicSubmissionDonationUrl' in source) {
    parsed.donationUrl = parseDonationUrl(source.publicSubmissionDonationUrl);
  }

  return parsed;
}

function boardQrImageUrl(relativePath) {
  const value = String(relativePath || '').trim();
  if (!value) {
    return '';
  }

  if (value.startsWith('provisioning/')) {
    return `/images/${value}`;
  }

  return `/images/${value.replace(/^\/+/, '')}`;
}

module.exports = {
  PUBLIC_SUBMISSION_DEFAULTS,
  normalizePublicSubmission,
  parsePublicSubmissionFromBody,
  parseDonationUrl,
  boardQrImageUrl,
};
