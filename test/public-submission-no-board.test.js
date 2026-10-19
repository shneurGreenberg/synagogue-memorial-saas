const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('public submission does not auto-add to board', () => {
  it('pushPersonAddRequests only appends personAddRequests', async () => {
    const updates = [];
    const Synagogue = require('../models/Synagogue');
    const originalFindOne = Synagogue.findOne;
    const originalUpdateOne = Synagogue.updateOne;

    Synagogue.findOne = async () => ({
      slug: 'demo',
      people: [{ id: 1 }],
      personAddRequests: [],
    });
    Synagogue.updateOne = async (query, update) => {
      updates.push(update);
    };

    const { pushPersonAddRequests } = require('../lib/public-submission-persist');

    const requests = await pushPersonAddRequests('demo', [{
      name: 'Test',
      fatherName: 'Father',
      relation: 'son',
      relationKey: 'ben',
      relationOther: '',
      deceasedNotes: '',
      diedAfterSunset: false,
      gregorianDateOfDeath: { year: 2020, month: 2, date: 3 },
    }], { name: 'Submitter', phone: '+1' }, []);

    Synagogue.findOne = originalFindOne;
    Synagogue.updateOne = originalUpdateOne;

    assert.equal(requests.length, 1);
    assert.equal(requests[0].status, 'pending');
    assert.equal(updates.length, 1);
    assert.ok(updates[0].$push && updates[0].$push.personAddRequests);
    assert.equal(updates[0].$push.people, undefined);
  });
});
