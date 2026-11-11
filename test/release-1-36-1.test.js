const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  planPerson, planNormalization, applyNormalization, restoreNormalization, runNameNormalization, BACKUP_COLLECTION,
} = require('../lib/name-normalization-run');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function fakeDb(synagogues) {
  const data = { synagogues: JSON.parse(JSON.stringify(synagogues)), [BACKUP_COLLECTION]: [] };
  const matches = (doc, filter) => Object.entries(filter).every(([k, v]) => doc[k] === v);
  const collection = (name) => ({
    find: (filter = {}) => ({ toArray: async () => JSON.parse(JSON.stringify(data[name].filter((d) => matches(d, filter)))) }),
    insertMany: async (docs) => { data[name].push(...docs); return { insertedCount: docs.length }; },
    updateOne: async (filter, update, opts) => {
      const doc = data[name].find((d) => matches(d, filter));
      if (!doc) return { modifiedCount: 0 };
      const af = opts.arrayFilters[0];
      const person = doc.people.find((p) => p.id === af['p.id'] && p.name === af['p.name']);
      if (!person) return { modifiedCount: 0 };
      Object.entries(update.$set).forEach(([k, v]) => { person[k.replace('people.$[p].', '')] = v; });
      return { modifiedCount: 1 };
    },
  });
  return { data, collection };
}

const SEED = [
  { slug: 'novosibirsk', people: [
    { id: 1, name: 'Дубов Берко сын Шмуль', gender: '' },
    { id: 2, name: 'Дубова Софа дочь Борух', gender: 'female' },
    { id: 3, name: 'Фрейдл Рахель Бат Исраэль', gender: 'unknown' },
    { id: 4, name: 'Иван бен Петр', gender: 'male' },
    { id: 5, name: 'Иванова Анна Петровна', gender: '' },
    { id: 6, name: 'Анна дочь Моше', gender: 'male' },
    { id: 7, name: 'Сынков Пётр', gender: '' },
  ] },
  { slug: 'tomsk', people: [{ id: 1, name: 'Кац Хаим сын Мордехая' }] },
];

describe('1.36.1 I64: name normalisation run (dry-run / apply / restore)', () => {
  it('plans only son/daughter word rewrites; gender only from the marker and only when missing', () => {
    assert.deepEqual(
      (({ newName, newGender, rule }) => ({ newName, newGender, rule }))(planPerson({ id: 1, name: 'Дубов Берко сын Шмуль', gender: '' })),
      { newName: 'Дубов Берко бен Шмуль', newGender: 'male', rule: 'сын→бен' },
    );
    assert.equal(planPerson({ id: 2, name: 'Дубова Софа дочь Борух', gender: 'female' }).newGender, 'female');
    assert.equal(planPerson({ id: 3, name: 'Фрейдл Рахель Бат Исраэль', gender: 'unknown' }).newName, 'Фрейдл Рахель бат Исраэль');
    assert.equal(planPerson({ id: 4, name: 'Иван бен Петр', gender: 'male' }), null);
    // gender inferred from a patronymic is not this migration's business
    assert.equal(planPerson({ id: 5, name: 'Иванова Анна Петровна', gender: '' }), null);
    assert.equal(planPerson({ id: 7, name: 'Сынков Пётр', gender: '' }), null);
    assert.equal(planPerson({ id: 6, name: 'Анна дочь Моше', gender: 'male' }).ambiguous, true);
  });

  it('dry-run counts per community and writes nothing', async () => {
    const db = fakeDb(SEED);
    const { summary, rows } = await planNormalization(db.collection('synagogues'));
    assert.equal(summary.nameChanges, 4);
    assert.equal(summary.skippedAmbiguous, 1);
    assert.equal(summary.genderSet, 3); // ids 1, 3 (unknown → female) and tomsk 1
    assert.deepEqual(summary.byCommunity, { novosibirsk: 3, tomsk: 1 });
    assert.equal(rows.length, 5);
    assert.equal(db.data.synagogues[0].people[0].name, 'Дубов Берко сын Шмуль');
    assert.equal(db.data[BACKUP_COLLECTION].length, 0);
  });

  it('apply backs up first, rewrites, skips ambiguous; re-run finds nothing; restore undoes by runId', async () => {
    const db = fakeDb(SEED);
    const res = await runNameNormalization(db, { mode: 'apply' });
    assert.match(res.runId, /^bb-\d{8}T\d{6}-[0-9a-f]{6}$/);
    assert.equal(res.updated, 4);
    assert.deepEqual(res.communities.sort(), ['novosibirsk', 'tomsk']);
    const backups = db.data[BACKUP_COLLECTION];
    assert.equal(backups.length, 4);
    assert.ok(backups.every((b) => b.runId === res.runId && b.createdAt instanceof Date));
    const nsk = db.data.synagogues[0].people;
    assert.equal(nsk[0].name, 'Дубов Берко бен Шмуль');
    assert.equal(nsk[0].gender, 'male');
    assert.equal(nsk[2].gender, 'female');
    assert.equal(nsk[5].name, 'Анна дочь Моше'); // ambiguous left alone
    assert.equal(nsk[4].gender, ''); // untouched
    const again = await runNameNormalization(db, { mode: 'dry-run' });
    assert.equal(again.summary.nameChanges, 0);

    // A later manual edit is not clobbered by restore.
    nsk[1].name = 'Дубова Софа бат Борух (ред.)';
    const back = await restoreNormalization(db.collection('synagogues'), db.collection(BACKUP_COLLECTION), res.runId);
    assert.equal(back.backups, 4);
    assert.equal(back.restored, 3);
    assert.equal(nsk[0].name, 'Дубов Берко сын Шмуль');
    assert.equal(nsk[0].gender, '');
    assert.equal(nsk[2].gender, 'unknown');
    assert.equal(nsk[1].name, 'Дубова Софа бат Борух (ред.)');
  });

  it('apply never overwrites a name changed since the plan was made', async () => {
    const db = fakeDb(SEED);
    const syn = db.collection('synagogues');
    const origUpdate = syn.updateOne;
    let first = true;
    syn.updateOne = async (...a) => {
      if (first) { first = false; db.data.synagogues[0].people[0].name = 'edited'; }
      return origUpdate(...a);
    };
    const res = await applyNormalization(syn, db.collection(BACKUP_COLLECTION));
    assert.equal(res.updated, 3);
    assert.equal(db.data.synagogues[0].people[0].name, 'edited');
  });

  it('master endpoint is behind master auth and invalidates caches', () => {
    const src = read('routes/master.js');
    assert.match(src, /router\.post\('\/api\/name-normalization', requireMasterApi,/);
    const block = src.slice(src.indexOf("'/api/name-normalization'"));
    assert.match(block, /invalidateBoardCache\(s\)/);
    assert.match(block, /invalidateAdminSynagogueCache\(s\)/);
  });

  it('manual workflow runs from main only and needs APPLY to write', () => {
    const wf = read('.github/workflows/name-normalization.yml');
    assert.match(wf, /workflow_dispatch:/);
    assert.doesNotMatch(wf, /\n\s+(push|schedule|pull_request):/);
    assert.match(wf, /github\.ref == 'refs\/heads\/main'/);
    assert.match(wf, /"\$CONFIRM" != "APPLY"/);
  });
});
