const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { proposeDropPatronymicDup } = require('../lib/normalize-patronymic');
const { planNormalization } = require('../lib/name-normalization-run');

const f = (n) => { const r = proposeDropPatronymicDup({ name: n }); return r ? (r.uncertain ? 'AMBIGUOUS' : r.newName) : null; };

describe('1.36.5 I66: drop the Russian patronymic when бен/бат + father is already there', () => {
  it('removes only the patronymic word in clear cases', () => {
    assert.equal(f('Немировский Абрам Исаакович бен Исаака'), 'Немировский Абрам бен Исаака');
    assert.equal(f('Гершевич Абрам Исаевич (Авраам бен Ишаягу)'), 'Гершевич Абрам (Авраам бен Ишаягу)');
    assert.equal(f('Шмуклярская Хана Абрамасовна(бат Абрамаса)'), 'Шмуклярская Хана (бат Абрамаса)');
    assert.equal(f('Кац  Мария Абрамовна  бат Абрама'), 'Кац Мария бат Абрама');
  });
  it('lists ambiguous cases without changing them', () => {
    assert.equal(f('Вайнер Семен бен Хаима (Шулем Хаймович)'), 'AMBIGUOUS');
    assert.equal(f('Страбыкина Лилия бат Михаил (Волчек Циля Менделевна)'), 'AMBIGUOUS');
    assert.equal(f('Кац Мария Абрамовна бен Исаака'), 'AMBIGUOUS');
    assert.equal(f('Кац Мария бат Абрама Ивановна'), 'AMBIGUOUS');
  });
  it('ignores names without both parts, -ович surnames first, and maiden names in parentheses', () => {
    assert.equal(f('Гершевич Аарон бен Гершона и Раисы'), null);
    assert.equal(f('Жеребцова (Рубанович) София бат Александра'), null);
    assert.equal(f('Орень Белла Ефимовна'), null);
    assert.equal(f('Дубов Берко бен Шмуль'), null);
  });
  it('plans rows with the gender unchanged', async () => {
    const synagogues = { find: () => ({ toArray: async () => [{ slug: 'nsk', people: [
      { id: 1, name: 'Немировский Абрам Исаакович бен Исаака', gender: 'male' },
      { id: 2, name: 'Вайнер Семен бен Хаима (Шулем Хаймович)' },
    ] }] }) };
    const { summary, rows } = await planNormalization(synagogues, { rule: 'drop-patronymic-dup' });
    assert.equal(summary.nameChanges, 1);
    assert.equal(summary.skippedUncertain, 1);
    assert.equal(rows[0].newGender, 'male');
    assert.equal(rows[0].kind, 'patronymic-dup');
  });
});
