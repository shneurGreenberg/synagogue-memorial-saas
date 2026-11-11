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
      'Виктор бен Александра',
    );
    assert.equal(
      buildDeceasedBoardName({
        deceasedName: 'daughter Jane',
        fatherName: 'John',
        gender: 'female',
        lang: 'en',
      }),
      'Jane bat John',
    );
  });

  it('1.36.0: picks בן/בת, бен/бат or ben/bat by the script the name is written in', () => {
    const { detectNameScript, genderPrefix } = require('../lib/deceased-board-name');
    assert.equal(detectNameScript('שרה'), 'he');
    assert.equal(detectNameScript('Софья'), 'ru');
    assert.equal(detectNameScript('Sarah'), 'en');
    assert.equal(detectNameScript('123'), '');
    assert.equal(genderPrefix('female', 'ru'), 'бат');
    assert.equal(genderPrefix('male', 'he'), 'בן');
    assert.equal(buildDeceasedBoardName({ deceasedName: 'שרה', fatherName: 'אברהם', gender: 'female', lang: 'ru' }), 'שרה בת אברהם');
    assert.equal(buildDeceasedBoardName({ deceasedName: 'Софья', fatherName: 'Рувима', gender: 'female', lang: 'he' }), 'Софья бат Рувима');
    assert.equal(buildDeceasedBoardName({ deceasedName: 'Иван', fatherName: '', gender: 'male', lang: 'ru' }), 'Иван');
  });
});
