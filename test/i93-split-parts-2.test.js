/**
 * 1.42.0 I93: split-parts-2 — finish partial / untouched rows (maiden surname, dashed surname,
 * two given names, Hebrew surname-last). `name` is never changed.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { composePersonName, normalizeNameOrder } = require('../lib/person-name');
const { buildParts2Context, proposeParts2Split, PARTS2_REASONS } = require('../lib/split-name-parts-2');
const {
  runNameNormalization, restoreNormalization, planNormalization, BACKUP_COLLECTION, newRunId, RULES,
} = require('../lib/name-normalization-run');

describe('1.42.0 I93: split-parts-2 proposals', () => {
  it('keeps Surname (Maiden) together and takes the following word as the given name', () => {
    const p = proposeParts2Split({ name: 'Коган (Берлин) Анна бен Моисей' }, 'surname-first');
    assert.equal(p.surname, 'Коган (Берлин)');
    assert.equal(p.givenName, 'Анна');
    assert.equal(p.parentName, 'Моисей');
    assert.equal(p.parentRelation, 'ben');
    assert.equal(composePersonName(p, 'surname-first'), 'Коган (Берлин) Анна бен Моисей');
  });

  it('keeps a dashed double surname exactly as written, with or without spaces', () => {
    const tight = proposeParts2Split({ name: 'Иванов-Петров Анна бат Сара' }, 'surname-first');
    assert.equal(tight.surname, 'Иванов-Петров');
    assert.equal(tight.givenName, 'Анна');
    assert.equal(tight.parentRelation, 'bat');
    const spaced = proposeParts2Split({ name: 'Иванов - Петров Анна бен Сара' }, 'surname-first');
    assert.equal(spaced.surname, 'Иванов - Петров');
    assert.equal(spaced.givenName, 'Анна');
    assert.equal(composePersonName(spaced, 'surname-first'), 'Иванов - Петров Анна бен Сара');
  });

  it('joins two known given names (builtin list, or tokens used as given names elsewhere)', () => {
    const builtin = proposeParts2Split({ name: 'Буторин Анна Ирина бен Моисей' }, 'surname-first');
    assert.equal(builtin.surname, 'Буторин');
    assert.equal(builtin.givenName, 'Анна Ирина');
    assert.equal(builtin.parentName, 'Моисей');

    const people = [
      { name: 'Коган Зина бен Абрам' },
      { name: 'Левин Зина бен Борис' },
      { name: 'Буторин Анна Зина бен Моисей' },
    ];
    const ctx = buildParts2Context(people, 'surname-first');
    assert.equal(ctx.givenAtPos.has('зина'), true);
    const row = proposeParts2Split({ name: 'Буторин Анна Зина бен Моисей' }, 'surname-first', ctx);
    assert.equal(row.givenName, 'Анна Зина');
    assert.equal(row.surname, 'Буторин');
    const unknown = proposeParts2Split({ name: 'Буторин Анна Злата бен Моисей' }, 'surname-first', ctx);
    assert.equal(unknown.reason, 'unknown-given');
  });

  it('does not let one reversed row block the rest of the family', () => {
    const people = [
      { name: 'Мирмильштейн Анна бен Абрам' },
      { name: 'Мирмильштейн Лев бен Борис' },
      { name: 'Анна Мирмильштейн бен Семен' },
      { name: 'Буторин Мирмильштейн Анна бен Семен' },
    ];
    const ctx = buildParts2Context(people, 'surname-first');
    assert.equal(ctx.givenAtPos.has('мирмильштейн'), false, 'a surname of 2+ other rows is not a given name');
    assert.equal(ctx.givenAtPos.has('анна'), true);
    const family = proposeParts2Split({ name: people[0].name }, 'surname-first', ctx);
    assert.equal(family.surname, 'Мирмильштейн');
    assert.equal(family.givenName, 'Анна');
    assert.equal(family.parentName, 'Абрам');
    const reversed = proposeParts2Split({ name: 'Анна Мирмильштейн бен Семен' }, 'surname-first', ctx);
    assert.equal(reversed.reason, 'reversed');
    const notAGiven = proposeParts2Split({ name: 'Буторин Мирмильштейн Анна бен Семен' }, 'surname-first', ctx);
    assert.equal(notAGiven.reason, 'unknown-given');
    assert.equal(proposeParts2Split({ name: 'Анна Мирмильштейн' }, 'surname-first', ctx).reason, 'no-marker');
  });

  it('leaves stray dots, missing markers, and other odd rows with a reason code', () => {
    assert.equal(proposeParts2Split({ name: 'Иванов А. бен Моисей' }, 'surname-first').reason, 'punct');
    assert.equal(proposeParts2Split({ name: 'Анна Мирмильштейн' }, 'surname-first').reason, 'no-marker');
    assert.equal(proposeParts2Split({ name: 'Иванов Анна бен' }, 'surname-first').reason, 'empty-part');
    assert.equal(proposeParts2Split({ name: 'Иван бен А бен Б' }, 'surname-first').reason, 'multi-marker');
    assert.equal(proposeParts2Split({ name: '' }, 'surname-first').reason, 'empty-name');
    const capital = proposeParts2Split({ name: 'Иванов Анна Бен Моисей' }, 'surname-first');
    assert.equal(capital.reason, 'identity-mismatch');
    assert.equal(capital.surname, undefined);
    [capital, proposeParts2Split({ name: 'Иванов А. бен Моисей' }, '')].forEach((p) => {
      assert.ok(PARTS2_REASONS.includes(p.reason), p.reason);
    });
  });

  it('keeps parents joined by «и» in one parentName', () => {
    const p = proposeParts2Split({ name: 'Иванов Анна бен Петр и Мария' }, 'surname-first');
    assert.equal(p.parentName, 'Петр и Мария');
    assert.equal(p.givenName, 'Анна');
    assert.equal(composePersonName(p, 'surname-first'), 'Иванов Анна бен Петр и Мария');
  });

  it('leaves a бен/бат marker that sits only inside brackets', () => {
    const p = proposeParts2Split({ name: 'Гершевич Абрам (Авраам бен Ишаягу)' }, 'surname-first');
    assert.equal(p.reason, 'marker-in-brackets');
    assert.equal(p.surname, undefined);
    assert.ok(PARTS2_REASONS.includes(p.reason));
    const outside = proposeParts2Split({ name: 'Иванов Анна бен Моисей (Авраам бен Ишаягу)' }, 'surname-first');
    assert.equal(outside.surname, 'Иванов');
    assert.equal(outside.givenName, 'Анна');
    assert.equal(outside.parentName, 'Моисей (Авраам бен Ишаягу)');
  });

  it('leaves two surnames with no dash, and still splits two known given names', () => {
    const doubled = proposeParts2Split({ name: 'Масамед Шнирман Фаня бат Абрам' }, 'surname-first');
    assert.equal(doubled.reason, 'double-surname-no-dash');
    assert.equal(doubled.surname, undefined);
    const twoGiven = proposeParts2Split({ name: 'Зингель Ефим Хаим бен Моисей' }, 'surname-first');
    assert.equal(twoGiven.surname, 'Зингель');
    assert.equal(twoGiven.givenName, 'Ефим Хаим');
    assert.equal(twoGiven.parentName, 'Моисей');
    assert.equal(composePersonName(twoGiven, 'surname-first'), 'Зингель Ефим Хаим бен Моисей');
  });

  it('does nothing when a surname is already stored', () => {
    const done = proposeParts2Split({
      name: 'Иванов Анна бен Моисей', surname: 'Иванов', givenName: 'Анна', parentName: 'Моисей', parentRelation: 'ben',
    }, 'surname-first');
    assert.equal(done.alreadyDone, true);
  });
});

describe('1.42.0 I93: Hebrew surname-last', () => {
  const people = [
    { name: 'אברהם בן יצחק כהן' },
    { name: 'שרה בת רבקה כהן' },
    { name: 'משה בן דוד ו שרה כהן' },
    { name: 'יעקב בן יצחק שרה' },
    { name: 'דוד בן אהרן' },
  ];

  it('moves a repeating or unknown last token out of parentName and composes surname-last', () => {
    const ctx = buildParts2Context(people, 'surname-first');
    assert.equal(ctx.surnameLast, true);
    const row = proposeParts2Split({ name: 'אברהם בן יצחק כהן' }, 'surname-last', ctx);
    assert.equal(row.surname, 'כהן');
    assert.equal(row.givenName, 'אברהם');
    assert.equal(row.parentName, 'יצחק');
    assert.equal(row.parentRelation, 'ben');
    assert.equal(composePersonName(row, 'surname-last'), 'אברהם בן יצחק כהן');
    const joined = proposeParts2Split({ name: 'משה בן דוד ו שרה כהן' }, 'surname-last', ctx);
    assert.equal(joined.surname, 'כהן');
    assert.equal(joined.parentName, 'דוד ו שרה');
    assert.equal(composePersonName(joined, 'surname-last'), 'משה בן דוד ו שרה כהן');
    const glued = proposeParts2Split({ name: 'משה בן יצחק ושרה כהן' }, 'surname-last', ctx);
    assert.equal(glued.parentName, 'יצחק ושרה');
    assert.equal(glued.surname, 'כהן');
    const stays = proposeParts2Split({ name: 'יעקב בן יצחק שרה' }, 'surname-last', ctx);
    assert.equal(stays.reason, 'shape');
  });

  it('leaves a Hebrew row that already starts with a surname used at the end of other rows', () => {
    const community = [
      { name: 'שמואל בן יצחק גרינברג' },
      { name: 'שרה בת רבקה גרינברג' },
      { name: 'גרינברג שמואל גרונם בן יצחק מאיר' },
    ];
    const ctx = buildParts2Context(community, 'surname-first');
    assert.equal(ctx.surnameLast, true);
    const row = proposeParts2Split({ name: 'גרינברג שמואל גרונם בן יצחק מאיר' }, 'surname-last', ctx);
    assert.equal(row.reason, 'hebrew-leading-surname');
    assert.equal(row.surname, undefined);
    const ordinary = proposeParts2Split({ name: 'שמואל בן יצחק גרינברג' }, 'surname-last', ctx);
    assert.equal(ordinary.surname, 'גרינברג');
    assert.equal(ordinary.givenName, 'שמואל');
    assert.equal(ordinary.parentName, 'יצחק');
  });

  it('does not switch a community that already has an order', () => {
    const ctx = buildParts2Context(people, 'surname-first');
    ctx.surnameLast = false;
    assert.equal(proposeParts2Split({ name: 'אברהם בן יצחק כהן' }, 'surname-first', ctx).reason, 'hebrew');
  });

  it('appends the surname after the base and leaves the other orders as they were', () => {
    assert.equal(normalizeNameOrder('surname-last'), 'surname-last');
    const parts = { surname: 'כהן', givenName: 'אברהם', parentName: 'יצחק', parentRelation: 'ben' };
    assert.equal(composePersonName(parts, 'surname-last'), 'אברהם בן יצחק כהן');
    assert.equal(
      composePersonName({ surname: 'Иванов', givenName: 'Иван', parentName: 'Александр', parentRelation: 'ben' }, 'surname-first'),
      'Иванов Иван бен Александр',
    );
    assert.equal(
      composePersonName({ surname: 'Иванов', givenName: 'Иван', parentName: 'Александр', parentRelation: 'ben' }, 'given-first'),
      'Иван Иванов бен Александр',
    );
    assert.equal(composePersonName(parts, ''), 'כהן אברהם בן יצחק');
  });
});

describe('1.42.0 I93: the rule is wired everywhere', () => {
  const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  it('is in the runner, the workflow, the CLI and the master allow-list', () => {
    assert.ok(RULES.includes('split-parts-2'));
    const wf = read('.github/workflows/name-normalization.yml');
    assert.match(wf, /options: \[[^\]]*split-parts-2\]/);
    assert.match(wf, /split-parts-2 \(/);
    const script = read('scripts/run-name-normalization.js');
    assert.match(script, /split-parts\|split-parts-2/);
    assert.match(script, /split-parts-2/);
    assert.match(script, /kind === 'split-parts-2'/);
    assert.match(script, /see the encrypted CSV/);
    const master = read('routes/master.js');
    assert.match(master, /RULES\.includes\(String\(req\.body\.rule\)\)/);
  });
});

describe('1.42.0 I93: split-parts-2 in the normalization run', () => {
  const SEED = [
    { slug: 'ru', people: [
      { id: 1, name: 'Коган (Берлин) Анна бен Моисей', givenName: 'Коган (Берлин) Анна бен Моисей' },
      { id: 2, name: 'Иванов - Петров Лев бен Борис' },
      { id: 3, name: 'Буторин Анна Ирина бат Сара' },
      { id: 4, name: 'Мирмильштейн Анна бен Абрам' },
      { id: 5, name: 'Мирмильштейн Лев бен Борис' },
      { id: 6, name: 'Анна Мирмильштейн бен Семен' },
      { id: 7, name: 'Анна Мирмильштейн' },
      { id: 8, name: 'Иванов А. бен Моисей' },
      { id: 9, name: 'Иванов Анна бен Петр и Мария' },
      { id: 10, name: 'Готов Иван бен Петр', surname: 'Готов', givenName: 'Иван', parentName: 'Петр', parentRelation: 'ben' },
    ] },
    { slug: 'he', people: [
      { id: 1, name: 'אברהם בן יצחק כהן' },
      { id: 2, name: 'שרה בת רבקה כהן' },
      { id: 3, name: 'משה בן דוד ו שרה כהן' },
    ] },
    { slug: 'kept', nameOrder: 'surname-first', people: [
      { id: 1, name: 'אברהם בן יצחק כהן' },
      { id: 2, name: 'שרה בת רבקה כהן' },
      { id: 3, name: 'משה בן דוד כהן' },
    ] },
  ];

  it('dry-run summary per community is {total, written, ambiguous, alreadyDone} plus byReason', async () => {
    const db = fakeDb(SEED);
    const dry = await runNameNormalization(db, { mode: 'dry-run', rule: 'split-parts-2' });
    assert.deepEqual(Object.keys(dry.summary.byCommunity.ru).sort(), ['alreadyDone', 'ambiguous', 'total', 'written']);
    assert.equal(dry.summary.byCommunity.ru.total, 10);
    assert.equal(dry.summary.byCommunity.ru.written, 6);
    assert.equal(dry.summary.byCommunity.ru.alreadyDone, 1);
    assert.equal(dry.summary.byCommunity.ru.ambiguous, 3);
    assert.equal(dry.summary.byCommunity.he.written, 3);
    assert.equal(dry.summary.byCommunity.he.ambiguous, 0);
    assert.equal(dry.summary.byCommunity.kept.written, 0);
    assert.equal(dry.summary.byCommunity.kept.ambiguous, 3);
    assert.equal(dry.summary.byReason.reversed, 1);
    assert.equal(dry.summary.byReason['no-marker'], 1);
    assert.equal(dry.summary.byReason.punct, 1);
    assert.equal(dry.summary.byReason.hebrew, 3);
    assert.equal(db.data.synagogues[0].people[0].surname, undefined);
  });

  it('apply writes parts, keeps name, uses an sp2- runId, and restores', async () => {
    assert.match(newRunId(new Date('2026-11-18T03:04:05Z'), 'sp2'), /^sp2-20261118T030405-[0-9a-f]{6}$/);
    const db = fakeDb(SEED);
    const res = await runNameNormalization(db, { mode: 'apply', rule: 'split-parts-2' });
    assert.match(res.runId, /^sp2-/);
    const ru = db.data.synagogues[0];
    const he = db.data.synagogues[1];
    assert.equal(ru.people[0].name, 'Коган (Берлин) Анна бен Моисей');
    assert.equal(ru.people[0].surname, 'Коган (Берлин)');
    assert.equal(ru.people[0].givenName, 'Анна');
    assert.equal(ru.people[0].parentName, 'Моисей');
    assert.equal(ru.people[5].surname, undefined);
    assert.equal(ru.people[8].parentName, 'Петр и Мария');
    assert.equal(ru.people[9].givenName, 'Иван');
    assert.equal(he.people[2].surname, 'כהן');
    assert.equal(he.people[2].parentName, 'דוד ו שרה');
    assert.equal(he.people[2].name, 'משה בן דוד ו שרה כהן');
    assert.equal(he.nameOrder, 'surname-last');
    assert.equal(db.data.synagogues[2].nameOrder, 'surname-first');
    assert.equal(composePersonName(he.people[0], 'surname-last'), he.people[0].name);

    const backup = db.data[BACKUP_COLLECTION].find((x) => x.community === 'ru' && x.personId === 1);
    assert.equal(backup.oldGivenName, 'Коган (Берлин) Анна бен Моисей');
    assert.equal(backup.newSurname, 'Коган (Берлин)');
    assert.equal(backup.kind, 'split-parts-2');
    assert.ok(backup.runId.startsWith('sp2-'));

    const back = await restoreNormalization(db.collection('synagogues'), db.collection(BACKUP_COLLECTION), res.runId);
    assert.ok(back.restored >= 6);
    assert.equal(ru.people[0].surname, '');
    assert.equal(ru.people[0].givenName, 'Коган (Берлин) Анна бен Моисей');
    assert.equal(ru.people[0].parentName, '');
    assert.equal(ru.people[0].name, 'Коган (Берлин) Анна бен Моисей');
    assert.equal(he.people[0].surname, '');
    assert.equal(he.nameOrder, '');
  });

  it('a second run writes nothing', async () => {
    const db = fakeDb(SEED);
    await runNameNormalization(db, { mode: 'apply', rule: 'split-parts-2' });
    const dry = await runNameNormalization(db, { mode: 'dry-run', rule: 'split-parts-2' });
    assert.equal(dry.summary.written, 0);
    const again = await runNameNormalization(db, { mode: 'apply', rule: 'split-parts-2' });
    assert.equal(again.updated, 0);
  });

  it('is reachable through planNormalization', async () => {
    const synagogues = { find: () => ({ toArray: async () => [{ slug: 'x', people: [{ id: 1, name: 'Коган (Берлин) Анна бен Моисей' }] }] }) };
    const { summary } = await planNormalization(synagogues, { rule: 'split-parts-2' });
    assert.equal(summary.written, 1);
    assert.equal(summary.byCommunity.x.total, 1);
  });
});

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
