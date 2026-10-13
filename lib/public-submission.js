const PUBLIC_SUBMISSION_DEFAULTS = {
  enabled: false,
  donationUrl: '',
  donationQrImage: '',
  registrationQrImage: '',
  showDonationQr: true,
  showRegistrationQr: true,
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
    showDonationQr: source.showDonationQr !== false,
    showRegistrationQr: source.showRegistrationQr !== false,
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

function parseFormCheckbox(body, name) {
  if (!body || !(name in body)) {
    return undefined;
  }

  const raw = body[name];
  if (Array.isArray(raw)) {
    return raw.some((value) => value === '1' || value === 'on' || value === true || value === 'true');
  }

  return raw === '1' || raw === 'on' || raw === true || raw === 'true';
}

function parsePublicSubmissionFromBody(body) {
  const source = body || {};
  const parsed = {};

  const enabled = parseFormCheckbox(source, 'publicSubmissionEnabled');
  if (enabled !== undefined) {
    parsed.enabled = enabled;
  }
  if ('publicSubmissionDonationUrl' in source) {
    parsed.donationUrl = parseDonationUrl(source.publicSubmissionDonationUrl);
  }
  const showDonationQr = parseFormCheckbox(source, 'publicSubmissionShowDonationQr');
  if (showDonationQr !== undefined) {
    parsed.showDonationQr = showDonationQr;
  }
  const showRegistrationQr = parseFormCheckbox(source, 'publicSubmissionShowRegistrationQr');
  if (showRegistrationQr !== undefined) {
    parsed.showRegistrationQr = showRegistrationQr;
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
  parseFormCheckbox,
  parseDonationUrl,
  boardQrImageUrl,
};
