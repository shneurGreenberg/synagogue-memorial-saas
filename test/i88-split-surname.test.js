const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  proposeSurnameSplit, isRussianSurnameToken, buildGivenAtPos, SPLIT_REASONS, COMMON_GIVEN_NAMES,
} = require('../lib/split-surname');
const { composePersonName } = require('../lib/person-name');
const {
  runNameNormalization, restoreNormalization, planNormalization, BACKUP_COLLECTION,
} = require('../lib/name-normalization-run');

describe('1.40.0 I88: split-surname token detection', () => {
  it('reports only the known reason codes', async () => {
    assert.deepEqual(SPLIT_REASONS, [
      'empty-name', 'order-unknown', 'hebrew', 'too-few-tokens', 'shape', 'multi-given', 'punct',
      'surname-is-given-name', 'given-shape', 'identity-mismatch',
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
  it('knows the builtin common given names', () => {
    ['Яков', 'Лев', 'Нина', 'Валентина', 'Анна', 'Марк'].forEach((w) => {
      assert.ok(COMMON_GIVEN_NAMES.has(w.toLowerCase()), w);
    });
  });
});

describe('1.40.1: structural rule — real surnames without morphology now split', () => {
  const order = 'surname-first';
  it('splits «Кац Арнольд бен Моисей»', () => {
    const p = proposeSurnameSplit({ name: 'Кац Арнольд бен Моисей' }, order);
    assert.equal(p.surname, 'Кац');
    assert.equal(p.givenName, 'Арнольд бен Моисей');
    assert.equal(p.reason, '');
  });
  it('splits «Сирота Анна бат Моисей» (Анна is a common given name)', () => {
    const p = proposeSurnameSplit({ name: 'Сирота Анна бат Моисей' }, order);
    assert.equal(p.surname, 'Сирота');
    assert.equal(p.givenName, 'Анна бат Моисей');
  });
  it('splits «Раксин Яков бен Авраам» (Яков is shaped like a surname)', () => {
    const p = proposeSurnameSplit({ name: 'Раксин Яков бен Авраам' }, order);
    assert.equal(p.surname, 'Раксин');
    assert.equal(p.givenName, 'Яков бен Авраам');
  });
  it('splits «Гинзбург Нина бат Лев» and «Коган Иосиф бен Лев»', () => {
    assert.equal(proposeSurnameSplit({ name: 'Гинзбург Нина бат Лев' }, order).surname, 'Гинзбург');
    assert.equal(proposeSurnameSplit({ name: 'Коган Иосиф бен Лев' }, order).surname, 'Коган');
  });
  it('never reads a given name as the surname', () => {
    assert.equal(proposeSurnameSplit({ name: 'Яков Иванов бен Авраам' }, order).reason, 'surname-is-given-name');
    assert.equal(proposeSurnameSplit({ name: 'Лев Кац бен Авраам' }, order).reason, 'surname-is-given-name');
    assert.equal(proposeSurnameSplit({ name: 'Нина Либерман бат Моисей' }, order).reason, 'surname-is-given-name');
    assert.equal(proposeSurnameSplit({ name: 'Валентина Абрамова бат Моисей' }, order).reason, 'surname-is-given-name');
  });
  it('keeps two tokens that are both surnames ambiguous', () => {
    assert.equal(proposeSurnameSplit({ name: 'Иванов Абрамова' }, order).reason, 'given-shape');
    assert.equal(proposeSurnameSplit({ name: 'Иванов Рабинович' }, order).reason, 'given-shape');
  });
});

describe('1.40.1: structural rule — shape and punctuation', () => {
  const order = 'surname-first';
  it('requires exactly two tokens before the בן/בת marker', () => {
    assert.equal(proposeSurnameSplit({ name: 'Иванов бен Александр' }, order).reason, 'shape');
    assert.equal(proposeSurnameSplit({ name: 'Иван Петр Иванов бен Моисей' }, order).reason, 'multi-given');
  });
  it('accepts only 2 tokens, or 3 with a Russian patronymic, when there is no marker', () => {
    assert.equal(proposeSurnameSplit({ name: 'Иванов Иван Моисей' }, order).reason, 'shape');
    const patronymic = proposeSurnameSplit({ name: 'Иванов Иван Моисеевич' }, order);
    assert.equal(patronymic.surname, 'Иванов');
    assert.equal(patronymic.givenName, 'Иван Моисеевич');
    const female = proposeSurnameSplit({ name: 'Кац Анна Моисеевна' }, order);
    assert.equal(female.surname, 'Кац');
    assert.equal(female.givenName, 'Анна Моисеевна');
  });
  it('refuses punctuation, initials and brackets', () => {
    assert.equal(proposeSurnameSplit({ name: 'Иванов (Иван) бен Александр' }, order).reason, 'punct');
    assert.equal(proposeSurnameSplit({ name: 'Иванов И. бен Александр' }, order).reason, 'punct');
    assert.equal(proposeSurnameSplit({ name: 'Иванов - Иван бен Александр' }, order).reason, 'punct');
  });
  it('allows a hyphenated surname', () => {
    const p = proposeSurnameSplit({ name: 'Кацман-Рабинович Сара бат Моисей' }, order);
    assert.equal(p.surname, 'Кацман-Рабинович');
    assert.equal(p.givenName, 'Сара бат Моисей');
  });
  it('does not split a single token or an empty name', () => {
    assert.equal(proposeSurnameSplit({ name: 'Иванов' }, order).reason, 'too-few-tokens');
    assert.equal(proposeSurnameSplit({ name: '' }, order).reason, 'empty-name');
    assert.equal(proposeSurnameSplit({ name: '   ' }, order).reason, 'empty-name');
  });
});

describe('1.40.0 I88: split-surname, surname-first community', () => {
  const order = 'surname-first';
  it('splits «Иванов Иван бен Александр»', () => {
    const p = proposeSurnameSplit({ name: 'Иванов Иван бен Александр' }, order);
    assert.equal(p.surname, 'Иванов');
    assert.equal(p.givenName, 'Иван бен Александр');
    assert.equal(p.reason, '');
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
  it('skips a person that already has a surname', () => {
    const p = proposeSurnameSplit({ name: 'Иванов Иван', surname: 'Иванов', givenName: 'Иван' }, order);
    assert.equal(p.alreadySplit, true);
  });
  it('compares the identity on the whitespace-collapsed name', () => {
    // stray whitespace is trimmed/collapsed, so the split still recomposes to the stored name
    const p = proposeSurnameSplit({ name: ' Иванов  Иван бен Александр ' }, order);
    assert.equal(p.surname, 'Иванов');
    assert.equal(p.givenName, 'Иван бен Александр');
    assert.equal(composePersonName(p, order), 'Иванов Иван бен Александр');
    // trailing decoration stays in the given-name part
    const deco = proposeSurnameSplit({ name: 'Иванов Иван бен Александр (?)' }, order);
    assert.equal(deco.givenName, 'Иван бен Александр (?)');
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
  it('leaves a name whose first token is the given name under this convention', () => {
    // «Иванов Иван» read as given-first: «Иванов» would be the given name — nothing to split safely.
    assert.equal(proposeSurnameSplit({ name: 'Иванов Иван' }, order).reason, 'shape');
  });
});

describe('1.40.1: community context (givenAtPos)', () => {
  it('collects the given-name position for each order', () => {
    const names = ['Кац Арнольд бен Моисей', 'Либерман Сара бат Моисей', 'Иосиф бен Лев'];
    assert.deepEqual([...buildGivenAtPos(names, 'surname-first')].sort(), ['арнольд', 'сара']);
    assert.deepEqual([...buildGivenAtPos(['Арнольд Кац бен Моисей'], 'given-first')], ['арнольд']);
  });
  it('keeps «Анна Мирмильштейн бат Моисей» ambiguous in a surname-first community', () => {
    const ctx = { givenAtPos: buildGivenAtPos(['Сирота Анна бат Моисей'], 'surname-first') };
    assert.deepEqual([...ctx.givenAtPos], ['анна']);
    const p = proposeSurnameSplit({ name: 'Анна Мирмильштейн бат Моисей' }, 'surname-first', ctx);
    assert.equal(p.reason, 'surname-is-given-name');
  });
  it('uses the community evidence for names the builtin list does not know', () => {
    // «Григорий» is not in the builtin list, so only the community can tell it is a given name.
    const name = 'Григорий Шапиро бен Моисей';
    assert.equal(proposeSurnameSplit({ name }, 'surname-first').surname, 'Григорий');
    const ctx = { givenAtPos: buildGivenAtPos(['Иванов Григорий бен Моисей'], 'surname-first') };
    assert.equal(proposeSurnameSplit({ name }, 'surname-first', ctx).reason, 'surname-is-given-name');
  });
});

describe('1.40.0 I88: split-surname ambiguous cases', () => {
  it('leaves everything alone when the convention is unknown', () => {
    assert.equal(proposeSurnameSplit({ name: 'Иванов Иван бен Александр' }, '').reason, 'order-unknown');
  });
  it('never splits a Hebrew-script name', () => {
    assert.equal(proposeSurnameSplit({ name: 'אברהם בן יצחק' }, 'surname-first').reason, 'hebrew');
    assert.equal(proposeSurnameSplit({ name: 'כהן אברהם בן יצחק' }, 'surname-first').reason, 'hebrew');
    assert.equal(proposeSurnameSplit({ name: 'כהן אברהם בן יצחק' }, 'given-first').reason, 'hebrew');
    // a Latin name is not Russian either, so it has no morphology to lean on
    assert.equal(proposeSurnameSplit({ name: 'Cohen' }, 'surname-first').reason, 'too-few-tokens');
  });
});

describe('1.40.0 I88: split-surname in the normalization run', () => {
  const SEED = [
    { slug: 'nsk', people: [
      { id: 1, name: 'Иванов Иван бен Александр' },
      { id: 2, name: 'Либерман Сара бат Моисей' },
      { id: 3, name: 'Яков Кацман бен Авраам' },
      { id: 4, name: 'Иванов Абрамова' },
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
    assert.deepEqual(dry.summary.byCommunity.nsk, { total: 5, split: 3, ambiguous: 2, alreadySplit: 0, order: 'surname-first' });
    assert.deepEqual(dry.summary.byCommunity.tomsk, { total: 3, split: 3, ambiguous: 0, alreadySplit: 0, order: 'given-first' });
    assert.equal(dry.summary.split, 6);
    assert.equal(dry.summary.ambiguous, 2);
    assert.equal(db.data.synagogues[0].people[0].surname, undefined);
    assert.equal(db.data.synagogues[0].nameOrder, undefined);
  });

  it('counts the ambiguous reasons', async () => {
    const db = fakeDb(SEED);
    const dry = await runNameNormalization(db, { mode: 'dry-run', rule: 'split-surname' });
    assert.equal(dry.summary.byReason['surname-is-given-name'], 1);
    assert.equal(dry.summary.byReason['given-shape'], 1);
    const yakov = dry.rows.find((r) => r.community === 'nsk' && r.id === 3);
    assert.equal(yakov.ambiguous, true);
    assert.equal(yakov.note, 'surname-is-given-name');
  });

  it('apply writes surname + givenName, keeps `name` byte-identical, sets nameOrder, restore clears it', async () => {
    const db = fakeDb(SEED);
    const res = await runNameNormalization(db, { mode: 'apply', rule: 'split-surname' });
    assert.equal(res.updated, 6);
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
    assert.equal(back.restored, 6);
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
    assert.equal(dry.summary.alreadySplit, 6);
    assert.equal(dry.summary.byCommunity.nsk.alreadySplit, 3);
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

  it('passes the community given-name evidence to every row of that community', async () => {
    const db = fakeDb([{ slug: 'ctx', nameOrder: 'surname-first', people: [
      { id: 1, name: 'Иванов Григорий бен Моисей' },
      { id: 2, name: 'Григорий Шапиро бен Моисей' },
    ] }]);
    const dry = await runNameNormalization(db, { mode: 'dry-run', rule: 'split-surname' });
    assert.equal(dry.summary.byCommunity.ctx.split, 1);
    assert.equal(dry.summary.byCommunity.ctx.ambiguous, 1);
    assert.equal(dry.rows.find((r) => r.id === 2).note, 'surname-is-given-name');
    assert.equal(dry.rows.find((r) => r.id === 1).surname, 'Иванов');
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
