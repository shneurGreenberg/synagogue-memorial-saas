const crypto = require('crypto');
const { normalizePersonContact } = require('./person-contact');

function generatePersonAddRequestId() {
  return crypto.randomBytes(12).toString('hex');
}

function resolvePersonAddRequestPublicId(source, index = 0) {
  const explicit = String(source.id || '').trim();
  if (explicit) {
    return explicit;
  }
  const created = source.createdAt ? new Date(source.createdAt).toISOString() : '';
  const deceased = String(source.deceasedName || '').trim();
  const submitterName = String((source.submitter && source.submitter.name) || '').trim();
  const payload = `${created}\0${deceased}\0${submitterName}\0${index}`;
  const digest = crypto.createHash('sha256').update(payload).digest('hex').slice(0, 24);
  return `legacy-${digest}`;
}

function isPendingPersonAddRequestStatus(rawStatus) {
  return rawStatus !== 'dismissed';
}

function normalizePersonAddRequest(raw, context = {}) {
  const source = raw || {};
  const index = Number.isFinite(context.index) ? context.index : 0;
  const death = source.gregorianDateOfDeath || {};
  const month = Number(death.month);
  const date = Number(death.date);
  const year = Number(death.year);
  const hasDate = Number.isFinite(month) && Number.isFinite(date) && Number.isFinite(year);

  return {
    id: resolvePersonAddRequestPublicId(source, index),
    status: isPendingPersonAddRequestStatus(source.status) ? 'pending' : 'dismissed',
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
  return raw.map((entry, index) => normalizePersonAddRequest(entry, { index }));
}

function listPendingPersonAddRequests(requests) {
  if (!Array.isArray(requests)) {
    return [];
  }
  return requests
    .map((entry, index) => normalizePersonAddRequest(entry, { index }))
    .filter((entry) => entry.status === 'pending')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function findPendingPersonAddRequestIndex(requests, requestId) {
  const targetId = String(requestId || '').trim();
  if (!targetId || !Array.isArray(requests)) {
    return -1;
  }
  for (let index = 0; index < requests.length; index += 1) {
    const normalized = normalizePersonAddRequest(requests[index], { index });
    if (normalized.id !== targetId || normalized.status !== 'pending') {
      continue;
    }
    return index;
  }
  return -1;
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
  resolvePersonAddRequestPublicId,
  isPendingPersonAddRequestStatus,
  normalizePersonAddRequest,
  normalizePersonAddRequests,
  listPendingPersonAddRequests,
  findPendingPersonAddRequestIndex,
  buildPersonAddRequest,
  validateRequestSubmitter,
};
