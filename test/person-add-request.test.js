const test = require('node:test');
const assert = require('node:assert');
const {
  buildPersonAddRequest,
  listPendingPersonAddRequests,
  findPendingPersonAddRequestIndex,
  resolvePersonAddRequestPublicId,
  validateRequestSubmitter,
} = require('../lib/person-add-request');
const { buildPersonFromAddRequest } = require('../lib/person-add-request-approve');

test('validateRequestSubmitter requires name and phone', () => {
  assert.equal(validateRequestSubmitter({ name: 'A', phone: '+1' }), true);
  assert.equal(validateRequestSubmitter({ name: 'A', email: 'a@b.c' }), false);
  assert.equal(validateRequestSubmitter({ phone: '+1' }), false);
});

test('listPendingPersonAddRequests filters dismissed', () => {
  const pending = listPendingPersonAddRequests([
    buildPersonAddRequest({
      submitter: { name: 'X', phone: '1' },
      deceasedName: 'Y',
      gregorianDateOfDeath: { month: 1, date: 2, year: 2020 },
    }),
    { id: 'old', status: 'dismissed', submitter: { name: 'Z', phone: '2' }, deceasedName: 'W' },
  ]);
  assert.equal(pending.length, 1);
  assert.equal(pending[0].deceasedName, 'Y');
});

test('legacy pending without id uses stable public id', () => {
  const raw = {
    deceasedName: 'Legacy Name',
    submitter: { name: 'Sub', phone: '1' },
    createdAt: '2024-06-01T00:00:00.000Z',
  };
  const idA = resolvePersonAddRequestPublicId(raw, 0);
  const idB = resolvePersonAddRequestPublicId(raw, 0);
  assert.equal(idA, idB);
  assert.match(idA, /^legacy-/);
});

test('findPendingPersonAddRequestIndex matches normalized pending without raw status', () => {
  const requests = [
    { id: 'keep', deceasedName: 'A', submitter: { name: 'S', phone: '1' } },
  ];
  const pending = listPendingPersonAddRequests(requests);
  const index = findPendingPersonAddRequestIndex(requests, pending[0].id);
  assert.equal(index, 0);
});

test('buildPersonFromAddRequest handles old and new deceased fields', () => {
  const oldFormat = buildPersonFromAddRequest({
    deceasedName: 'ישראל ישראלי',
    deceasedFatherName: 'אברהם',
    deceasedGender: '',
    gregorianDateOfDeath: { month: 5, date: 10, year: 2018 },
    submitter: { name: 'Contact', phone: '0501234567' },
  }, 'he');
  assert.match(oldFormat.name, /בן/);

  const newFormat = buildPersonFromAddRequest({
    deceasedName: 'Cohen Rivka',
    deceasedFatherName: 'Yitzchak',
    deceasedGender: 'female',
    diedAfterSunset: true,
    gregorianDateOfDeath: { month: 2, date: 3, year: 2022 },
    submitter: { name: 'Contact', phone: '+972501234567', platform: 'whatsapp' },
  }, 'en');
  assert.match(newFormat.name, /daughter/);
  assert.equal(newFormat.diedAfterSunset, true);
});
