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

function normalizePersonContact(raw) {
  const source = raw || {};
  const contact = {
    name: String(source.name || '').trim().slice(0, 120),
    phone: String(source.phone || '').trim().slice(0, 30),
    email: String(source.email || '').trim().slice(0, 200),
    gender: normalizeContactGender(source.gender),
    platform: normalizeContactPlatform(source.platform),
  };

  if (!contact.platform) {
    if (contact.phone) {
      contact.platform = 'max';
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

function normalizePersonContacts(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map(normalizePersonContact)
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

function parseContactsArrayFromBody(rawContacts) {
  if (!rawContacts) {
    return [];
  }

  if (Array.isArray(rawContacts)) {
    return normalizePersonContacts(rawContacts);
  }

  if (typeof rawContacts === 'object') {
    return normalizePersonContacts(Object.values(rawContacts));
  }

  return [];
}

function parsePersonContactsFromBody(body) {
  const source = body || {};

  if (typeof source.contactsJson === 'string' && source.contactsJson.trim()) {
    try {
      const parsed = JSON.parse(source.contactsJson);
      const fromJson = parseContactsArrayFromBody(parsed);
      if (fromJson.length > 0) {
        return fromJson;
      }
    } catch (err) {
      /* fall through */
    }
  }

  const fromArray = parseContactsArrayFromBody(source.contacts);
  if (fromArray.length > 0) {
    return fromArray;
  }

  const legacy = parsePersonContactFromBody(source);
  return hasContactDetails(legacy) ? [legacy] : [];
}

function parsePersonContactFromBody(body) {
  return normalizePersonContact({
    name: body.contactName,
    phone: body.contactPhone,
    email: body.contactEmail,
    gender: body.contactGender,
    platform: body.contactPlatform,
  });
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
