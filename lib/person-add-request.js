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
    deceasedName: String(source.deceasedName || '').trim().slice(0, 120),
    deceasedNotes: String(source.deceasedNotes || '').trim().slice(0, 2000),
    gregorianDateOfDeath: hasDate ? { month, date, year } : undefined,
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
