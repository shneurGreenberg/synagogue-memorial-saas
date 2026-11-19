/**
 * 1.42.3: swap-parents — approve-only swap of two parents joined by « и » or « ו ».
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  runNameNormalization, restoreNormalization, BACKUP_COLLECTION, RULES,
} = require('../lib/name-normalization-run');

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

function fakeDb(synagogues) {
  const data = { synagogues: JSON.parse(JSON.stringify(synagogues)), [BACKUP_COLLECTION]: [] };
  const matchValue = (val, cond) => {
    if (cond && typeof cond === 'object' && cond.$in) {
      const list = cond.$in;
      return val === undefined ? list.some((x) => x === null) : list.includes(val);
    }
    return val === cond;
  };
  const matches = (doc, f) => Object.entries(f).every(([k, v]) => matchValue(doc[k], v));
  const collection = (name) => ({
    find: (f = {}) => ({ toArray: async () => JSON.parse(JSON.stringify(data[name].filter((d) => matches(d, f)))) }),
    insertMany: async (docs) => { data[name].push(...JSON.parse(JSON.stringify(docs))); return {}; },
    updateOne: async (f, update, opts) => {
      const doc = data[name].find((d) => matches(d, f));
      if (!doc) return { modifiedCount: 0 };
      if (opts && opts.arrayFilters) {
        const af = opts.arrayFilters[0];
        const person = (doc.people || []).find((p) => Object.entries(af).every(([k, v]) => matchValue(p[k.slice(2)], v)));
        if (!person) return { modifiedCount: 0 };
        Object.entries(update.$set).forEach(([k, v]) => { person[k.replace('people.$[p].', '')] = v; });
        return { modifiedCount: 1 };
      }
      Object.entries(update.$set).forEach(([k, v]) => { doc[k] = v; });
      return { modifiedCount: 1 };
    },
  });
  return { data, collection };
}

const RU = {
  id: 1,
  name: 'Фридман Мария бат Энта и Соломон',
  surname: 'Фридман',
  givenName: 'Мария',
  parentName: 'Энта и Соломон',
  parentRelation: 'bat',
  gender: 'female',
};

describe('1.42.3 swap-parents', () => {
  it('is listed in the runner, the workflow choice, and the CLI docs', () => {
    assert.ok(RULES.includes('swap-parents'));
    const wf = read('.github/workflows/name-normalization.yml');
    assert.match(wf, /options: \[[^\]]*swap-parents\]/);
    assert.match(wf, /swap-parents \(/);
    const script = read('scripts/run-name-normalization.js');
    assert.match(script, /split-parts-2\|swap-parents/);
    assert.match(script, /kind === 'swap-parents'/);
  });

  it('swaps a Russian «и» pair, leaves a non-approved row, skips one parent, and restores', async () => {
    const other = {
      id: 2,
      name: 'Фридман Анна бат Рива и Лев',
      surname: 'Фридман',
      givenName: 'Анна',
      parentName: 'Рива и Лев',
      parentRelation: 'bat',
      gender: 'female',
    };
    const one = {
      id: 3,
      name: 'Фридман Иван бен Петр',
      surname: 'Фридман',
      givenName: 'Иван',
      parentName: 'Петр',
      parentRelation: 'ben',
      gender: 'male',
    };
    const db = fakeDb([{ slug: 'nsk', nameOrder: 'surname-first', people: [RU, other, one] }]);
    const dryNone = await runNameNormalization(db, { mode: 'dry-run', rule: 'swap-parents' });
    assert.equal(dryNone.summary.written, 0);
    assert.equal(dryNone.rows.length, 0);

    const res = await runNameNormalization(db, {
      mode: 'apply', rule: 'swap-parents', approve: ['nsk:1', 'nsk:3'],
    });
    assert.match(res.runId, /^sw-/);
    const people = db.data.synagogues[0].people;
    assert.equal(people[0].name, 'Фридман Мария бат Соломон и Энта');
    assert.equal(people[0].parentName, 'Соломон и Энта');
    assert.equal(people[0].surname, 'Фридман');
    assert.equal(people[0].givenName, 'Мария');
    assert.equal(people[0].parentRelation, 'bat');
    assert.equal(people[0].gender, 'female');
    assert.equal(people[1].name, other.name);
    assert.equal(people[1].parentName, other.parentName);
    assert.equal(people[2].name, one.name);
    assert.equal(people[2].parentName, 'Петр');
    const skipped = res.rows.find((row) => row.id === 3);
    assert.equal(skipped.ambiguous, true);
    assert.equal(skipped.note, 'not-two-parents');
    assert.equal(res.summary.written, 1);
    assert.equal(res.summary.skipped, 1);
    assert.deepEqual(res.summary.writtenIds, ['nsk:1']);
    assert.deepEqual(res.summary.skippedIds, ['nsk:3']);
    const backup = db.data[BACKUP_COLLECTION].find((row) => row.personId === 1);
    assert.equal(backup.oldName, RU.name);
    assert.equal(backup.oldParentName, 'Энта и Соломон');
    assert.equal(backup.newName, 'Фридман Мария бат Соломон и Энта');
    assert.equal(backup.newParentName, 'Соломон и Энта');
    assert.equal(db.data[BACKUP_COLLECTION].some((row) => row.personId === 2), false);

    const back = await restoreNormalization(db.collection('synagogues'), db.collection(BACKUP_COLLECTION), res.runId);
    assert.equal(back.restored, 1);
    assert.equal(people[0].name, RU.name);
    assert.equal(people[0].parentName, 'Энта и Соломон');
    assert.equal(people[0].surname, 'Фридман');
  });

  it('swaps a Hebrew «ו» pair using the community surname-last order', async () => {
    const he = {
      id: 7,
      name: 'שרה בת לאה ו רבקה כהן',
      surname: 'כהן',
      givenName: 'שרה',
      parentName: 'לאה ו רבקה',
      parentRelation: 'bat',
      gender: 'female',
    };
    const db = fakeDb([{ slug: 'he', nameOrder: 'surname-last', people: [he] }]);
    const res = await runNameNormalization(db, {
      mode: 'apply', rule: 'swap-parents', approve: ['he:7'],
    });
    const person = db.data.synagogues[0].people[0];
    assert.equal(res.summary.written, 1);
    assert.equal(person.parentName, 'רבקה ו לאה');
    assert.equal(person.name, 'שרה בת רבקה ו לאה כהן');
    assert.equal(person.surname, 'כהן');
    assert.equal(person.givenName, 'שרה');
    assert.equal(person.parentRelation, 'bat');
  });
});
