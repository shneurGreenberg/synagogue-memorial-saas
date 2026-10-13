const test = require('node:test');
const assert = require('node:assert');
const {
  buildPersonAddRequest,
  listPendingPersonAddRequests,
  validateRequestSubmitter,
} = require('../lib/person-add-request');

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
