const CONTACT_PLATFORMS = ['whatsapp', 'telegram', 'max', 'sms', 'email'];
const CONTACT_GENDERS = ['male', 'female', ''];

function normalizeContactPlatform(raw) {
  const value = String(raw || '').trim().toLowerCase();
  return CONTACT_PLATFORMS.includes(value) ? value : '';
}

function resolveContactPlatform(contact) {
  const normalized = normalizePersonContact(contact);
  if (normalized.platform) {
    return normalized.platform;
  }

  if (normalized.phone) {
    return 'max';
  }

  if (normalized.email) {
    return 'email';
  }

  return '';
}

function normalizeContactGender(raw) {
  const value = String(raw || '').trim().toLowerCase();
  return CONTACT_GENDERS.includes(value) ? value : '';
}

/** 1.31.0 I22: Hebrew boards default phone contacts to WhatsApp. */
function defaultPhonePlatformFor(language) {
  return String(language || '').toLowerCase().startsWith('he') ? 'whatsapp' : 'max';
}

function normalizePersonContact(raw, options) {
  const source = raw || {};
  const phoneDefault = (options && options.defaultPhonePlatform) || 'max';
  const contact = {
    name: String(source.name || '').trim().slice(0, 120),
    phone: String(source.phone || '').trim().slice(0, 30),
    email: String(source.email || '').trim().slice(0, 200),
    gender: normalizeContactGender(source.gender),
    platform: normalizeContactPlatform(source.platform),
  };

  if (!contact.platform) {
    if (contact.phone) {
      contact.platform = phoneDefault;
    } else if (contact.email) {
      contact.platform = 'email';
    }
  }

  return contact;
}

function hasContactDetails(contact) {
  const normalized = normalizePersonContact(contact);
  return !!(normalized.name || normalized.phone || normalized.email);
}

function hasContactInfo(contact) {
  const normalized = normalizePersonContact(contact);
  const platform = resolveContactPlatform(normalized);

  if (!platform) {
    return false;
  }

  if (platform === 'email') {
    return !!normalized.email;
  }

  return !!normalized.phone;
}

function normalizePersonContacts(raw, options) {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((c) => normalizePersonContact(c, options))
    .filter(hasContactDetails);
}

function getPersonContacts(person) {
  if (!person || typeof person !== 'object') {
    return [];
  }

  if (Array.isArray(person.contacts) && person.contacts.length > 0) {
    return normalizePersonContacts(person.contacts);
  }

  const legacy = normalizePersonContact(person.contact);
  return hasContactDetails(legacy) ? [legacy] : [];
}

function getPrimaryPersonContact(person) {
  const contacts = getPersonContacts(person);
  return contacts[0] || normalizePersonContact(person && person.contact);
}

function parseContactsArrayFromBody(rawContacts, options) {
  if (!rawContacts) {
    return [];
  }

  if (Array.isArray(rawContacts)) {
    return normalizePersonContacts(rawContacts, options);
  }

  if (typeof rawContacts === 'object') {
    return normalizePersonContacts(Object.values(rawContacts), options);
  }

  return [];
}

function parsePersonContactsFromBody(body, options) {
  const source = body || {};

  if (typeof source.contactsJson === 'string' && source.contactsJson.trim()) {
    try {
      const parsed = JSON.parse(source.contactsJson);
      const fromJson = parseContactsArrayFromBody(parsed, options);
      if (fromJson.length > 0) {
        return fromJson;
      }
    } catch (err) {
      /* fall through */
    }
  }

  const fromArray = parseContactsArrayFromBody(source.contacts, options);
  if (fromArray.length > 0) {
    return fromArray;
  }

  const legacy = parsePersonContactFromBody(source, options);
  return hasContactDetails(legacy) ? [legacy] : [];
}

function parsePersonContactFromBody(body, options) {
  const { resolvePhoneFromBody } = require('./public-submission-phone');
  return normalizePersonContact({
    name: body.contactName,
    phone: resolvePhoneFromBody(body),
    email: body.contactEmail,
    gender: body.contactGender,
    platform: body.contactPlatform,
  }, options);
}

function personContactsToLegacyFields(contacts) {
  const primary = contacts[0] || normalizePersonContact();
  return {
    contact: primary,
    contacts,
  };
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
  defaultPhonePlatformFor,
  CONTACT_PLATFORMS,
  CONTACT_GENDERS,
  normalizeContactPlatform,
  resolveContactPlatform,
  normalizeContactGender,
  normalizePersonContact,
  normalizePersonContacts,
  getPersonContacts,
  getPrimaryPersonContact,
  parsePersonContactsFromBody,
  parsePersonContactFromBody,
  personContactsToLegacyFields,
  hasContactDetails,
  hasContactInfo,
  validatePublicSubmissionContact,
};
