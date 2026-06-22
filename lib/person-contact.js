const CONTACT_PLATFORMS = ['whatsapp', 'telegram', 'max', 'sms', 'email'];

function normalizeContactPlatform(raw) {
  const value = String(raw || '').trim().toLowerCase();
  return CONTACT_PLATFORMS.includes(value) ? value : 'whatsapp';
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

function hasContactInfo(contact) {
  const normalized = normalizePersonContact(contact);
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
  hasContactInfo,
  validatePublicSubmissionContact,
};
