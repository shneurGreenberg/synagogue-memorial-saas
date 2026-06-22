const CONTACT_PLATFORMS = ['whatsapp', 'telegram', 'max', 'sms', 'email'];

function normalizeContactPlatform(raw) {
  const value = String(raw || '').trim().toLowerCase();
  return CONTACT_PLATFORMS.includes(value) ? value : '';
}

function normalizePersonContact(raw) {
  const source = raw || {};

  return {
    name: String(source.name || '').trim().slice(0, 120),
    phone: String(source.phone || '').trim().slice(0, 30),
    email: String(source.email || '').trim().slice(0, 200),
    platform: normalizeContactPlatform(source.platform),
  };
}

function parsePersonContactFromBody(body) {
  return normalizePersonContact({
    name: body.contactName,
    phone: body.contactPhone,
    email: body.contactEmail,
    platform: body.contactPlatform,
  });
}

function hasContactDetails(contact) {
  const normalized = normalizePersonContact(contact);
  return !!(normalized.name || normalized.phone || normalized.email);
}

function hasContactInfo(contact) {
  const normalized = normalizePersonContact(contact);
  if (!normalized.platform) {
    return false;
  }

  if (normalized.platform === 'email') {
    return !!normalized.email;
  }

  return !!normalized.phone;
}

function validatePublicSubmissionContact(contact) {
  const normalized = normalizePersonContact(contact);

  if (!normalized.name) {
    return false;
  }

  if (!normalized.platform) {
    return !!normalized.email;
  }

  if (normalized.platform === 'email') {
    return !!normalized.email;
  }

  if (normalized.email) {
    return true;
  }

  return !!normalized.phone;
}

module.exports = {
  CONTACT_PLATFORMS,
  normalizeContactPlatform,
  normalizePersonContact,
  parsePersonContactFromBody,
  hasContactDetails,
  hasContactInfo,
  validatePublicSubmissionContact,
};
