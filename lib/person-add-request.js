const crypto = require('crypto');
const { normalizePersonContact } = require('./person-contact');

function generatePersonAddRequestId() {
  return crypto.randomBytes(12).toString('hex');
}

function normalizePersonAddRequest(raw) {
  const source = raw || {};
  const death = source.gregorianDateOfDeath || {};
  const month = Number(death.month);
  const date = Number(death.date);
  const year = Number(death.year);
  const hasDate = Number.isFinite(month) && Number.isFinite(date) && Number.isFinite(year);

  return {
    id: String(source.id || '').trim() || generatePersonAddRequestId(),
    status: source.status === 'dismissed' ? 'dismissed' : 'pending',
    createdAt: source.createdAt ? new Date(source.createdAt) : new Date(),
    submitter: normalizePersonContact(source.submitter),
    relation: String(source.relation || '').trim().slice(0, 120),
    relationKey: String(source.relationKey || '').trim().slice(0, 32),
    relationOther: String(source.relationOther || '').trim().slice(0, 120),
    deceasedName: String(source.deceasedName || '').trim().slice(0, 120),
    deceasedFatherName: String(source.deceasedFatherName || '').trim().slice(0, 120),
    deceasedGender: source.deceasedGender === 'female' ? 'female' : (source.deceasedGender === 'male' ? 'male' : ''),
    deceasedNotes: String(source.deceasedNotes || '').trim().slice(0, 2000),
    dataConsent: source.dataConsent === true,
    consentAt: source.consentAt ? new Date(source.consentAt) : undefined,
    diedAfterSunset: source.diedAfterSunset === true,
    gregorianDateOfDeath: hasDate ? { month, date, year } : undefined,
    photo: String(source.photo || '').trim(),
    photoCrop: source.photoCrop,
  };
}

function normalizePersonAddRequests(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map(normalizePersonAddRequest);
}

function listPendingPersonAddRequests(requests) {
  return normalizePersonAddRequests(requests)
    .filter((entry) => entry.status === 'pending')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function buildPersonAddRequest(payload) {
  return normalizePersonAddRequest({
    ...payload,
    id: generatePersonAddRequestId(),
    status: 'pending',
    createdAt: new Date(),
  });
}

function validateRequestSubmitter(contact) {
  const normalized = normalizePersonContact(contact);
  if (!normalized.name) {
    return false;
  }
  return !!normalized.phone;
}

module.exports = {
  generatePersonAddRequestId,
  normalizePersonAddRequest,
  normalizePersonAddRequests,
  listPendingPersonAddRequests,
  buildPersonAddRequest,
  validateRequestSubmitter,
};
