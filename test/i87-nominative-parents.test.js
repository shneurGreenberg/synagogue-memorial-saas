const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { proposeNominativeParents, nominativeFatherField, nominativeWord } = require('../lib/nominative-name');
const { planNormalization } = require('../lib/name-normalization-run');
const { buildDeceasedBoardName } = require('../lib/deceased-board-name');

const f = (n) => { const r = proposeNominativeParents({ name: n }); return r ? (r.uncertain ? 'UNCERTAIN' : r.newName) : null; };

describe('I87: parent names after бен/бат in the nominative', () => {
  it('converts regular and irregular genitives', () => {
    assert.equal(f('Иванов Виктор бен Александра'), 'Иванов Виктор бен Александр');
    assert.equal(f('Иванова Анна бат Моисея'), 'Иванова Анна бат Моисей');
    assert.equal(f('Иванов Яков бен Ильи'), 'Иванов Яков бен Илья');
    assert.equal(f('Иванов Борис бен Павла'), 'Иванов Борис бен Павел');
    assert.equal(f('Иванов Абрам бен Льва'), 'Иванов Абрам бен Лев');
    assert.equal(f('Иванов Борис бен Лазаря'), 'Иванов Борис бен Лазарь');
    assert.equal(f('Иванова Вера бат Никиты'), 'Иванова Вера бат Никита');
    assert.equal(f('Иванова Вера бат Евсея'), 'Иванова Вера бат Евсей');
  });
  it('converts both parents and double names', () => {
    assert.equal(f('Иванов Михаил бен Иосифа и Ривы'), 'Иванов Михаил бен Иосиф и Рива');
    assert.equal(f('Иванова Эсфирь бат Марии и Семена'), 'Иванова Эсфирь бат Мария и Семен');
    assert.equal(f('Иванов Семен бен Арона и Хаи-Гени'), 'Иванов Семен бен Арон и Хая-Геня');
    assert.equal(f('Иванова Дебора бат Моисея и Хаи.'), 'Иванова Дебора бат Моисей и Хая.');
    assert.equal(f('Иванов Абрам бен Исаака Моисея'), 'Иванов Абрам бен Исаак Моисей');
    assert.equal(f('Иванова Анна бат Розы и Любови'), 'Иванова Анна бат Роза и Любовь');
  });
  it('leaves nominatives, parentheses and Hebrew alone', () => {
    assert.equal(f('Иванов Иосиф бен Моисей'), null);
    assert.equal(f('Иванова Мария бат Энта и Соломона'), 'Иванова Мария бат Энта и Соломон');
    assert.equal(f('Иванов Семен бен Хаима (Шулем Хаймович)'), 'Иванов Семен бен Хаим (Шулем Хаймович)');
    assert.equal(f('Иванов Абрам (Авраам бен Ишаягу)'), null);
    assert.equal(f('אברהם בן יצחק'), null);
  });
  it('flags ambiguous or unknown words instead of guessing', () => {
    assert.equal(f('Иванов Герш бен Лейба'), 'UNCERTAIN');
    assert.equal(f('Иванов Шмуль бен Эли'), 'UNCERTAIN');
    assert.equal(f('Иванов Идель бен Шульмана'), 'UNCERTAIN');
    assert.equal(f('Иванова Мария бат Абрама Ивановна'), 'UNCERTAIN');
    assert.equal(proposeNominativeParents({ name: 'Иванов Герш бен Лейба' }).proposedName, 'Иванов Герш бен Лейб');
    assert.equal(nominativeWord('Араама').suggest, 'Авраам');
  });
  it('new input: father field typed in the genitive goes on the board in the nominative', () => {
    assert.equal(nominativeFatherField('Александра'), 'Александр');
    assert.equal(nominativeFatherField('Лейба'), 'Лейба');
    assert.equal(buildDeceasedBoardName({ deceasedName: 'Иванов Виктор', fatherName: 'Александра', gender: 'male', lang: 'ru' }), 'Иванов Виктор бен Александр');
    assert.equal(buildDeceasedBoardName({ deceasedName: 'Иванова Анна', fatherName: 'Моисей', gender: 'female', lang: 'ru' }), 'Иванова Анна бат Моисей');
  });
  it('runs as the nominative-parents rule of the name normalization run (dry-run)', async () => {
    const synagogues = { find: () => ({ toArray: async () => [{ slug: 'x', people: [
      { id: 1, name: 'Иванов Виктор бен Александра' }, { id: 2, name: 'Иванов Герш бен Лейба' }, { id: 3, name: 'Иванов Иосиф бен Моисей' },
    ] }] }) };
    const { summary, rows } = await planNormalization(synagogues, { rule: 'nominative-parents' });
    assert.equal(summary.nameChanges, 1);
    assert.equal(summary.skippedUncertain, 1);
    assert.equal(rows.find((r) => r.id === 1).newName, 'Иванов Виктор бен Александр');
  });
});
