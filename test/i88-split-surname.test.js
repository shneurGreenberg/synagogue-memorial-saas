const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { proposeSurnameSplit, isRussianSurnameToken, SPLIT_REASONS } = require('../lib/split-surname');
const { composePersonName } = require('../lib/person-name');
const {
  runNameNormalization, restoreNormalization, planNormalization, BACKUP_COLLECTION,
} = require('../lib/name-normalization-run');

describe('1.40.0 I88: split-surname token detection', () => {
  it('reports only the known reason codes', async () => {
    assert.deepEqual(SPLIT_REASONS, [
      'empty-name', 'order-unknown', 'too-few-tokens', 'no-surname-token', 'no-given-name',
      'surname-shape', 'given-shape', 'hebrew-no-marker', 'identity-mismatch',
    ]);
    const { summary } = await planNormalization(
      { find: () => ({ toArray: async () => [{ slug: 'x', people: [{ id: 1, name: 'Коган Иосиф' }] }] }) },
      { rule: 'split-surname' },
    );
    Object.keys(summary.byReason).forEach((code) => assert.ok(SPLIT_REASONS.includes(code), code));
  });
  it('recognises Russian surname morphology, both genders', () => {
    ['Иванов', 'Абрамов', 'Либерман', 'Райзер', 'Гуревич', 'Пинскер', 'Могилевский', 'Мельцер',
      'Иванова', 'Каганицкая', 'Кацнельсон-Абрамова']
      .forEach((w) => assert.ok(isRussianSurnameToken(w), `${w} should look like a surname`));
    ['Иван', 'Сара', 'Коган', 'Мельц', 'Кац', 'Шапиро', 'Авраам', 'бен', 'bat'].forEach((w) => {
      assert.equal(isRussianSurnameToken(w), false, `${w} should not look like a surname`);
    });
  });
});

describe('1.40.0 I88: split-surname, surname-first community', () => {
  const order = 'surname-first';
  it('splits «Иванов Иван бен Александр»', () => {
    const p = proposeSurnameSplit({ name: 'Иванов Иван бен Александр' }, order);
    assert.equal(p.surname, 'Иванов');
    assert.equal(p.givenName, 'Иван бен Александр');
    assert.equal(p.reason, '');
    // identity: recomposing gives back the stored name exactly
    assert.equal(composePersonName({ ...p, name: 'Иванов Иван бен Александр' }, order), 'Иванов Иван бен Александр');
  });
  it('splits a female surname and a plain two-token name', () => {
    const f = proposeSurnameSplit({ name: 'Иванова Анна бат Моисей' }, order);
    assert.equal(f.surname, 'Иванова');
    assert.equal(f.givenName, 'Анна бат Моисей');
    const plain = proposeSurnameSplit({ name: 'Либерман Абрам' }, order);
    assert.equal(plain.surname, 'Либерман');
    assert.equal(plain.givenName, 'Абрам');
  });
  it('leaves rows whose surname token is not morphologically a surname', () => {
    assert.equal(proposeSurnameSplit({ name: 'Коган Иосиф' }, order).reason, 'surname-shape');
  });
  it('leaves rows where both head tokens look like surnames', () => {
    assert.equal(proposeSurnameSplit({ name: 'Иванов Абрамов' }, order).reason, 'given-shape');
  });
  it('leaves rows with no clear given-name part', () => {
    assert.equal(proposeSurnameSplit({ name: 'Иванов бен Александр' }, order).reason, 'no-given-name');
    assert.equal(proposeSurnameSplit({ name: 'Иванов' }, order).reason, 'too-few-tokens');
    assert.equal(proposeSurnameSplit({ name: '' }, order).reason, 'empty-name');
  });
  it('skips a person that already has a surname', () => {
    const p = proposeSurnameSplit({ name: 'Иванов Иван', surname: 'Иванов', givenName: 'Иван' }, order);
    assert.equal(p.alreadySplit, true);
  });
  it('refuses any split that would not recompose to the same bytes', () => {
    // double space inside the name would be normalised away by composePersonName
    assert.equal(proposeSurnameSplit({ name: 'Иванов  Иван бен Александр' }, order).reason, 'identity-mismatch');
    // stray leading whitespace is not reproduced either
    assert.equal(proposeSurnameSplit({ name: ' Иванов Иван' }, order).reason, 'identity-mismatch');
    // trailing/leading decoration is kept, so that one still splits
    const p = proposeSurnameSplit({ name: 'Иванов Иван бен Александр (?)' }, order);
    assert.equal(p.givenName, 'Иван бен Александр (?)');
    assert.equal(composePersonName({ ...p, name: 'Иванов Иван бен Александр (?)' }, order), 'Иванов Иван бен Александр (?)');
  });
});

describe('1.40.0 I88: split-surname, given-first community', () => {
  const order = 'given-first';
  it('splits «Иван Иванов бен Александр»', () => {
    const p = proposeSurnameSplit({ name: 'Иван Иванов бен Александр' }, order);
    assert.equal(p.surname, 'Иванов');
    assert.equal(p.givenName, 'Иван бен Александр');
    assert.equal(p.reason, '');
    assert.equal(composePersonName({ ...p, name: 'Иван Иванов бен Александр' }, order), 'Иван Иванов бен Александр');
  });
  it('splits a female given-first name', () => {
    const p = proposeSurnameSplit({ name: 'Анна Иванова бат Моисей' }, order);
    assert.equal(p.surname, 'Иванова');
    assert.equal(p.givenName, 'Анна бат Моисей');
  });
  it('uses the same position in a name without a patronymic', () => {
    const p = proposeSurnameSplit({ name: 'Абрам Либерман' }, order);
    assert.equal(p.surname, 'Либерман');
    assert.equal(p.givenName, 'Абрам');
  });
  it('leaves a name whose first token is the surname under the other convention', () => {
    // «Иванов Иван» read as given-first: «Иванов» is the given name, «Иван» is not a surname.
    assert.equal(proposeSurnameSplit({ name: 'Иванов Иван' }, order).reason, 'surname-shape');
  });
});

describe('1.40.0 I88: split-surname ambiguous cases', () => {
  it('leaves everything alone when the convention is unknown', () => {
    assert.equal(proposeSurnameSplit({ name: 'Иванов Иван бен Александр' }, '').reason, 'order-unknown');
  });
  it('splits Hebrew only with 2+ tokens before בן/בת and a known convention', () => {
    assert.equal(proposeSurnameSplit({ name: 'אברהם בן יצחק' }, 'surname-first').reason, 'hebrew-no-marker');
    const p = proposeSurnameSplit({ name: 'כהן אברהם בן יצחק' }, 'surname-first');
    assert.equal(p.surname, 'כהן');
    assert.equal(p.givenName, 'אברהם בן יצחק');
    assert.equal(composePersonName({ ...p, name: 'כהן אברהם בן יצחק' }, 'surname-first'), 'כהן אברהם בן יצחק');
  });
});

describe('1.40.0 I88: split-surname in the normalization run', () => {
  const SEED = [
    { slug: 'nsk', people: [
      { id: 1, name: 'Иванов Иван бен Александр' },
      { id: 2, name: 'Либерман Сара бат Моисей' },
      { id: 3, name: 'Коган Иосиф бен Лев' },
      { id: 4, name: 'Иванов Абрамов' },
      { id: 5, name: 'Шапиро Лев бен Ицхак' },
    ] },
    { slug: 'tomsk', nameOrder: 'given-first', people: [
      { id: 1, name: 'Иван Иванов бен Александр' },
      { id: 2, name: 'Анна Либерман бат Моисей' },
      { id: 3, name: 'Иван Петров бен Арон' },
    ] },
  ];

  it('dry-run reports per community {total, split, ambiguous, alreadySplit, order} without writing', async () => {
    const db = fakeDb(SEED);
    const dry = await runNameNormalization(db, { mode: 'dry-run', rule: 'split-surname' });
    assert.deepEqual(Object.keys(dry.summary.byCommunity).sort(), ['nsk', 'tomsk']);
    assert.deepEqual(dry.summary.byCommunity.nsk, { total: 5, split: 2, ambiguous: 3, alreadySplit: 0, order: 'surname-first' });
    assert.deepEqual(dry.summary.byCommunity.tomsk, { total: 3, split: 3, ambiguous: 0, alreadySplit: 0, order: 'given-first' });
    assert.equal(dry.summary.split, 5);
    assert.equal(dry.summary.ambiguous, 3);
    assert.equal(db.data.synagogues[0].people[0].surname, undefined);
    assert.equal(db.data.synagogues[0].nameOrder, undefined);
  });

  it('counts the ambiguous reasons', async () => {
    const db = fakeDb(SEED);
    const dry = await runNameNormalization(db, { mode: 'dry-run', rule: 'split-surname' });
    assert.equal(dry.summary.byReason['surname-shape'], 2);
    assert.equal(dry.summary.byReason['given-shape'], 1);
    const kogan = dry.rows.find((r) => r.community === 'nsk' && r.id === 3);
    assert.equal(kogan.ambiguous, true);
    assert.equal(kogan.note, 'surname-shape');
  });

  it('apply writes surname + givenName, keeps `name` byte-identical, sets nameOrder, restore clears it', async () => {
    const db = fakeDb(SEED);
    const res = await runNameNormalization(db, { mode: 'apply', rule: 'split-surname' });
    assert.equal(res.updated, 5);
    const nsk = db.data.synagogues[0];
    const tomsk = db.data.synagogues[1];

    assert.equal(nsk.people[0].name, 'Иванов Иван бен Александр');
    assert.equal(nsk.people[0].surname, 'Иванов');
    assert.equal(nsk.people[0].givenName, 'Иван бен Александр');
    assert.equal(composePersonName(nsk.people[0], 'surname-first'), nsk.people[0].name);
    assert.equal(nsk.nameOrder, 'surname-first');

    assert.equal(nsk.people[2].surname, undefined, 'ambiguous rows untouched');
    assert.equal(nsk.people[3].surname, undefined, 'ambiguous rows untouched');

    assert.equal(tomsk.people[0].name, 'Иван Иванов бен Александр');
    assert.equal(tomsk.people[0].surname, 'Иванов');
    assert.equal(tomsk.people[0].givenName, 'Иван бен Александр');
    assert.equal(composePersonName(tomsk.people[0], 'given-first'), tomsk.people[0].name);
    assert.equal(tomsk.nameOrder, 'given-first', 'a saved order is kept');

    // backup holds the split + the order it set
    const b = db.data[BACKUP_COLLECTION].find((x) => x.community === 'nsk' && x.personId === 1);
    assert.equal(b.newSurname, 'Иванов');
    assert.equal(b.newNameOrder, 'surname-first');
    assert.equal(b.oldNameOrder, '');

    const back = await restoreNormalization(db.collection('synagogues'), db.collection(BACKUP_COLLECTION), res.runId);
    assert.equal(back.restored, 5);
    assert.equal(nsk.people[0].surname, '');
    assert.equal(nsk.people[0].givenName, '');
    assert.equal(nsk.people[0].name, 'Иванов Иван бен Александр');
    assert.equal(nsk.nameOrder, '', 'nameOrder cleared when the run set it');
    assert.equal(tomsk.nameOrder, 'given-first', 'a pre-existing order is not touched by restore');
    assert.equal(tomsk.people[0].surname, '');
  });

  it('second run reports the rows as alreadySplit and writes nothing', async () => {
    const db = fakeDb(SEED);
    await runNameNormalization(db, { mode: 'apply', rule: 'split-surname' });
    const dry = await runNameNormalization(db, { mode: 'dry-run', rule: 'split-surname' });
    assert.equal(dry.summary.split, 0);
    assert.equal(dry.summary.alreadySplit, 5);
    assert.equal(dry.summary.byCommunity.nsk.alreadySplit, 2);
    const res2 = await runNameNormalization(db, { mode: 'apply', rule: 'split-surname' });
    assert.equal(res2.updated, 0);
  });

  it('a community with no detectable convention is ambiguous, and nameOrder stays empty', async () => {
    const db = fakeDb([{ slug: 'x', people: [{ id: 1, name: 'Иванов Иван бен Александр' }] }]);
    const dry = await runNameNormalization(db, { mode: 'dry-run', rule: 'split-surname' });
    assert.equal(dry.summary.byCommunity.x.order, '');
    assert.equal(dry.summary.byCommunity.x.ambiguous, 1);
    assert.equal(dry.summary.byReason['order-unknown'], 1);
    const res = await runNameNormalization(db, { mode: 'apply', rule: 'split-surname' });
    assert.equal(res.updated, 0);
    assert.equal(db.data.synagogues[0].nameOrder, undefined);
  });

  it('is reachable through planNormalization (rule dispatch)', async () => {
    const synagogues = { find: () => ({ toArray: async () => [{ slug: 'nsk', people: [
      { id: 1, name: 'Иванов Иван бен Александр' }, { id: 2, name: 'Либерман Сара бат Моисей' },
    ] }] }) };
    const { summary } = await planNormalization(synagogues, { rule: 'split-surname' });
    assert.equal(summary.split, 2);
    assert.equal(summary.byCommunity.nsk.order, 'surname-first');
  });
});

function fakeDb(synagogues) {
  const data = { synagogues: JSON.parse(JSON.stringify(synagogues)), [BACKUP_COLLECTION]: [] };
  // Mongo-ish match: a plain value compares with `===`, {$in:[...]} also matches undefined/null.
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
