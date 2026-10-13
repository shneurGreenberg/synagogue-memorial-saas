const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { fingerprintPeopleText } = require('../lib/board-people-text');
const { computeBoardVersion } = require('../lib/board-payload');

describe('board people text fingerprint', () => {
  it('changes version when biography text changes but people rows omit text', () => {
    const basePeople = [
      { id: 1, name: 'A', gregorianDateOfDeath: { year: 2000, month: 1, day: 2 } },
    ];

    const boardA = {
      slug: 'demo',
      title: 'T',
      people: basePeople,
      __peopleTextFingerprint: fingerprintPeopleText([{ id: 1, text: 'one' }]),
    };
    const boardB = {
      ...boardA,
      __peopleTextFingerprint: fingerprintPeopleText([{ id: 1, text: 'two' }]),
    };

    assert.notEqual(computeBoardVersion(boardA), computeBoardVersion(boardB));
  });

  it('fingerprint is stable for the same text set', () => {
    const people = [{ id: 2, text: 'bio' }, { id: 3, text: '' }];
    assert.equal(fingerprintPeopleText(people), fingerprintPeopleText(people));
  });
});
