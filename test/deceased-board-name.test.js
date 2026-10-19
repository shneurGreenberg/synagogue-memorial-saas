const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  stripLeadingGenderPrefix,
  buildDeceasedBoardName,
} = require('../lib/deceased-board-name');

describe('deceased board name', () => {
  it('strips leading gender tokens typed by submitters', () => {
    assert.equal(stripLeadingGenderPrefix('בן משה'), 'משה');
    assert.equal(stripLeadingGenderPrefix('сын Иван'), 'Иван');
    assert.equal(stripLeadingGenderPrefix('daughter Jane'), 'Jane');
  });

  it('builds memorial name with gender prefix before father name', () => {
    assert.equal(
      buildDeceasedBoardName({
        deceasedName: 'משה',
        fatherName: 'אברהם',
        gender: 'male',
        lang: 'he',
      }),
      'משה בן אברהם',
    );
    assert.equal(
      buildDeceasedBoardName({
        deceasedName: 'Виктор',
        fatherName: 'Александра',
        gender: 'male',
        lang: 'ru',
      }),
      'Виктор сын Александра',
    );
    assert.equal(
      buildDeceasedBoardName({
        deceasedName: 'daughter Jane',
        fatherName: 'John',
        gender: 'female',
        lang: 'en',
      }),
      'Jane daughter John',
    );
  });
});
