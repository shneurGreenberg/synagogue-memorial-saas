const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { proposePatronymic } = require('../lib/normalize-patronymic');
const { runNameNormalization, restoreNormalization, BACKUP_COLLECTION } = require('../lib/name-normalization-run');

const conv = (n, g) => { const r = proposePatronymic({ name: n, gender: g }); return r && !r.uncertain ? r.newName : (r ? 'UNCERTAIN' : null); };

describe('1.37.0 I65: Russian patronymic → бен/бат + father', () => {
  it('converts the examples from the request', () => {
    assert.equal(conv('Орень Белла Ефимовна'), 'Орень Белла бат Ефим');
    assert.equal(conv('Аникштейн Григорий Моисеевич'), 'Аникштейн Григорий бен Моисей');
    assert.equal(conv('Мельц Моисей Исаакович'), 'Мельц Моисей бен Исаак');
    assert.equal(conv('Зуншайн Михаил Ошерович'), 'Зуншайн Михаил бен Ошер');
    assert.equal(conv('Махензон Мария Рафаиловна'), 'Махензон Мария бат Рафаил');
    assert.equal(conv('Либерман Дуня Мееровна'), 'Либерман Дуня бат Меер');
    assert.equal(conv('Кац Вера Исаковна'), 'Кац Вера бат Исак');
  });
  it('handles irregular and soft-sign forms', () => {
    assert.equal(conv('Иванов Пётр Ильич'), 'Иванов Пётр бен Илья');
    assert.equal(conv('Рапопорт Анна Львовна'), 'Рапопорт Анна бат Лев');
    assert.equal(conv('Кот Иван Никитич'), 'Кот Иван бен Никита');
    assert.equal(conv('Ким Ольга Яковлевна'), 'Ким Ольга бат Яков');
    assert.equal(conv('Ким Ольга Григорьевна'), 'Ким Ольга бат Григорий');
    assert.equal(conv('Сальник Абрам Исаевич'), 'Сальник Абрам бен Исай');
    assert.equal(conv('Кац Шмуль Срульевич'), 'Кац Шмуль бен Сруль');
    assert.equal(conv('Кот Мария Ильинична'), 'Кот Мария бат Илья');
    assert.equal(conv('Ханина Фаина Семёновна'), 'Ханина Фаина бат Семён');
    assert.equal(conv('Дунаевский Хаим Аврам-Иосифович'), 'Дунаевский Хаим бен Аврам-Иосиф');
    assert.equal(conv('Вельдер Моисей Нухимович'), 'Вельдер Моисей бен Нухим');
  });
  it('keeps parentheses, nicknames and surrounding text in place', () => {
    assert.equal(conv('Кац (Муся) Мария Абрамовна'), 'Кац (Муся) Мария бат Абрам');
    assert.equal(conv('Кац Мария Абрамовна (Муся)'), 'Кац Мария бат Абрам (Муся)');
    assert.equal(conv('Иванова (Рабинович) Мария Ильинична'), 'Иванова (Рабинович) Мария бат Илья');
  });
  it('skips names with no patronymic, existing markers and Hebrew', () => {
    assert.equal(conv('Рабинович Иосиф'), null);
    assert.equal(conv('Мельц (Марко) Нина'), null);
    assert.equal(conv('Дубов Берко бен Шмуль'), null);
    assert.equal(conv('שרה בת אברהם'), null);
    assert.equal(conv('Годес'), null);
  });
  it('lists uncertain derivations and conflicts instead of converting', () => {
    assert.equal(conv('Шварцман Зельма Ошевич'), 'UNCERTAIN');
    assert.equal(conv('Шапиро Биннета Акибовна'), 'UNCERTAIN');
    assert.equal(conv('Иосиф Рабинович'), 'UNCERTAIN');
    assert.equal(conv('Кац Сара Абрамович'), 'UNCERTAIN');
    assert.equal(conv('Кац Мария Абрамовна', 'male'), 'UNCERTAIN');
    assert.equal(conv('Иванова Мария (Абрамовна)'), 'UNCERTAIN');
  });
});

function fakeDb(synagogues) {
  const data = { synagogues: JSON.parse(JSON.stringify(synagogues)), [BACKUP_COLLECTION]: [] };
  const matches = (doc, f) => Object.entries(f).every(([k, v]) => doc[k] === v);
  const collection = (name) => ({
    find: (f = {}) => ({ toArray: async () => JSON.parse(JSON.stringify(data[name].filter((d) => matches(d, f)))) }),
    insertMany: async (docs) => { data[name].push(...docs); return {}; },
    updateOne: async (f, update, opts) => {
      const doc = data[name].find((d) => matches(d, f));
      const af = opts.arrayFilters[0];
      const ok = (val, cond) => (cond && cond.$in ? cond.$in.includes(val === undefined ? null : val) : val === cond);
      const person = doc && doc.people.find((p) => Object.entries(af).every(([k, v]) => ok(p[k.slice(2)], v)));
      if (!person) return { modifiedCount: 0 };
      Object.entries(update.$set).forEach(([k, v]) => { person[k.replace('people.$[p].', '')] = v; });
      return { modifiedCount: 1 };
    },
  });
  return { data, collection };
}

describe('1.37.0 I65: patronymic rule in dry-run/apply/restore', () => {
  const SEED = [{ slug: 'nsk', people: [
    { id: 1, name: 'Орень Белла Ефимовна' },
    { id: 2, name: 'Аникштейн Григорий Моисеевич', gender: 'male' },
    { id: 3, name: 'Шварцман Зельма Ошевич' },
    { id: 4, name: 'Каганицкая Елизавета' },
  ] }];
  it('dry-run counts; apply writes only certain rows with gender where missing; restore reverts', async () => {
    const db = fakeDb(SEED);
    const dry = await runNameNormalization(db, { mode: 'dry-run', rule: 'patronymic' });
    assert.equal(dry.summary.nameChanges, 2);
    assert.equal(dry.summary.skippedUncertain, 1);
    assert.equal(dry.summary.genderSet, 1);
    assert.equal(db.data.synagogues[0].people[0].name, 'Орень Белла Ефимовна');
    const res = await runNameNormalization(db, { mode: 'apply', rule: 'patronymic' });
    assert.equal(res.updated, 2);
    const p = db.data.synagogues[0].people;
    assert.equal(p[0].name, 'Орень Белла бат Ефим');
    assert.equal(p[0].gender, 'female');
    assert.equal(p[1].name, 'Аникштейн Григорий бен Моисей');
    assert.equal(p[2].name, 'Шварцман Зельма Ошевич');
    const back = await restoreNormalization(db.collection('synagogues'), db.collection(BACKUP_COLLECTION), res.runId);
    assert.equal(back.restored, 2);
    assert.equal(p[0].name, 'Орень Белла Ефимовна');
    assert.equal(p[0].gender, '');
  });
  it('rejects an unknown rule', async () => {
    await assert.rejects(() => runNameNormalization(fakeDb(SEED), { mode: 'dry-run', rule: 'x' }));
  });
});
