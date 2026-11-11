const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { inferGenderCertain } = require('../lib/gender-certain');
const { runNameNormalization, restoreNormalization, BACKUP_COLLECTION } = require('../lib/name-normalization-run');

const g = (n) => inferGenderCertain(n).gender;

describe('1.36.2 I64b: strict gender inference (only when certain)', () => {
  it('infers from known first names, patronymics and unambiguous surname endings', () => {
    assert.equal(g('Кофман Евгений Аронович'), 'male');
    assert.equal(g('Котес Бейла Симховна'), 'female');
    assert.equal(g('Элентух Эльевна'), 'female');
    assert.equal(g('Бученко Евфалия Афанасьева'), 'female');
    assert.equal(g('Туровский Лев Николаевич'), 'male');
    assert.equal(g('שרה כהן'), 'female');
    assert.equal(g('Марк-Перкальскене Белла Самуиловна'), 'female');
  });
  it('stays unsure on conflicts, invariant -ович/-ин surnames and missing signals', () => {
    assert.equal(g('Рабинович Сима Х.'), 'female');
    assert.equal(g('Рабинович Х.'), '');
    assert.equal(g('Левин Сима'), '');
    assert.equal(g('Шварцман Зельма Ошевич'), '');
    assert.equal(g('Ниренберг Х. Д.'), '');
    assert.equal(g('Годес'), '');
    assert.equal(g('התוועדות חנוכת הבית'), '');
    assert.equal(g('Каплан Саша'), '');
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
      const person = doc && doc.people.find((p) => Object.entries(af).every(([k, v]) => (p[k.slice(2)] || '') === v));
      if (!person) return { modifiedCount: 0 };
      Object.entries(update.$set).forEach(([k, v]) => { person[k.replace('people.$[p].', '')] = v; });
      return { modifiedCount: 1 };
    },
  });
  return { data, collection };
}

describe('1.36.2 I64b: gender-only rows in apply/restore', () => {
  const SEED = [{ slug: 'tomsk', people: [
    { id: 1, name: 'Кофман Евгений Аронович' },
    { id: 2, name: 'Ниренберг Х. Д.', gender: 'unknown' },
    { id: 3, name: 'Котес Бейла Симховна', gender: 'female' },
    { id: 4, name: 'Кац Хаим сын Мордехая', gender: 'male' },
  ] }];

  it('dry-run reports inferred vs uncertain; apply sets gender only, never the name; restore reverts', async () => {
    const db = fakeDb(SEED);
    const dry = await runNameNormalization(db, { mode: 'dry-run' });
    assert.deepEqual(dry.summary.genderInferred, { male: 1, female: 0 });
    assert.equal(dry.summary.genderUncertain, 1);
    assert.equal(dry.summary.nameChanges, 1);
    const res = await runNameNormalization(db, { mode: 'apply' });
    assert.equal(res.updated, 2);
    const p = db.data.synagogues[0].people;
    assert.equal(p[0].name, 'Кофман Евгений Аронович');
    assert.equal(p[0].gender, 'male');
    assert.equal(p[1].gender, 'unknown');
    assert.equal(p[3].name, 'Кац Хаим бен Мордехая');
    const backup = db.data[BACKUP_COLLECTION].find((b) => b.personId === 1);
    assert.equal(backup.kind, 'gender');
    assert.equal(backup.oldGender, '');
    const again = await runNameNormalization(db, { mode: 'dry-run' });
    assert.equal(again.summary.nameChanges + again.summary.genderInferred.male + again.summary.genderInferred.female, 0);
    const back = await restoreNormalization(db.collection('synagogues'), db.collection(BACKUP_COLLECTION), res.runId);
    assert.equal(back.restored, 2);
    assert.equal(p[0].gender, '');
    assert.equal(p[3].name, 'Кац Хаим сын Мордехая');
  });
});
