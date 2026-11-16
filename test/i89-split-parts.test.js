/**
 * 1.41.0 I89: the split-parts rule — surname, givenName (given words only), parentName and
 * parentRelation, on top of the 1.40.0 surname split. `name` is never changed.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { proposePartsSplit, PARTS_REASONS, splitAtMarker } = require('../lib/split-name-parts');
const { composePersonName, torahReadingName } = require('../lib/person-name');
const {
  runNameNormalization, restoreNormalization, planNormalization, BACKUP_COLLECTION, newRunId, RULES,
} = require('../lib/name-normalization-run');

describe('1.41.0 I89: split-parts proposals', () => {
  it('finishes a row 1.40.0 already split (surname set, marker inside givenName)', () => {
    const p = proposePartsSplit(
      { name: 'Иванов Иван бен Александр', surname: 'Иванов', givenName: 'Иван бен Александр' },
      'surname-first',
    );
    assert.equal(p.reason, undefined);
    assert.equal(p.surname, 'Иванов');
    assert.equal(p.givenName, 'Иван');
    assert.equal(p.parentName, 'Александр');
    assert.equal(p.parentRelation, 'ben');
    assert.equal(p.partial, false);
  });
  it('splits an unsplit row, taking the surname from the 1.40.0 rule', () => {
    const p = proposePartsSplit({ name: 'Иванов Иван бен Александр' }, 'surname-first');
    assert.equal(p.surname, 'Иванов');
    assert.equal(p.givenName, 'Иван');
    assert.equal(p.parentName, 'Александр');
    assert.equal(p.parentRelation, 'ben');
    assert.equal(p.partial, false);
  });
  it('reads the marker in any script or spelling: бен / בן / ben → ben, бат / בת / bat → bat', () => {
    const he = proposePartsSplit({ name: 'אברהם בן יצחק' }, 'surname-first');
    assert.equal(he.givenName, 'אברהם');
    assert.equal(he.parentName, 'יצחק');
    assert.equal(he.parentRelation, 'ben');
    const heBat = proposePartsSplit({ name: 'שרה בת יצחק' }, 'surname-first');
    assert.equal(heBat.parentRelation, 'bat');
    const ruBat = proposePartsSplit({ name: 'Анна бат Моисей' }, 'surname-first');
    assert.equal(ruBat.parentRelation, 'bat');
    const lat = proposePartsSplit({ name: 'Abram ben Yitzhak' }, 'surname-first');
    assert.equal(lat.givenName, 'Abram');
    assert.equal(lat.parentName, 'Yitzhak');
    assert.equal(lat.parentRelation, 'ben');
    // Only the stored spelling survives: a marker in another script would recompose differently.
    assert.deepEqual(splitAtMarker('Иван בת משה').parentRelation, 'bat');
  });
  it('leaves a name whose marker is written in another script than the name', () => {
    // «Иванов Иван בן משה» would recompose as «Иванов Иван бен משה» — the name must not change.
    assert.equal(proposePartsSplit({ name: 'Иванов Иван בן משה' }, 'surname-first').reason, 'identity-mismatch');
  });
  it('keeps parentheses in the parent name', () => {
    const p = proposePartsSplit({ name: 'Иванов Иван бен Александр (Сендер)' }, 'surname-first');
    assert.equal(p.givenName, 'Иван');
    assert.equal(p.parentName, 'Александр (Сендер)');
    assert.equal(composePersonName(p, 'surname-first'), 'Иванов Иван бен Александр (Сендер)');
  });
  it('uses bat for a female name', () => {
    const p = proposePartsSplit({ name: 'Иванова Анна бат Моисей', gender: 'female' }, 'surname-first');
    assert.equal(p.surname, 'Иванова');
    assert.equal(p.givenName, 'Анна');
    assert.equal(p.parentName, 'Моисей');
    assert.equal(p.parentRelation, 'bat');
    assert.equal(torahReadingName(p), 'Анна бат Моисей');
  });
  it('leaves an ambiguous surname empty but still writes the parent part (partial)', () => {
    // A Hebrew name has no Russian morphology, so only the marker can be used.
    const he = proposePartsSplit({ name: 'כהן אברהם בן יצחק' }, 'surname-first');
    assert.equal(he.surname, '');
    assert.equal(he.givenName, 'כהן אברהם');
    assert.equal(he.parentName, 'יצחק');
    assert.equal(he.parentRelation, 'ben');
    assert.equal(he.partial, true);
    assert.equal(he.note, 'hebrew');
    // Unknown convention: the surname cannot be told, but the marker can.
    const orderUnknown = proposePartsSplit({ name: 'Иванов Иван бен Александр' }, '');
    assert.equal(orderUnknown.surname, '');
    assert.equal(orderUnknown.givenName, 'Иванов Иван');
    assert.equal(orderUnknown.parentName, 'Александр');
    assert.equal(orderUnknown.note, 'order-unknown');
  });
  it('never writes a row whose name would not recompose exactly (identity failure)', () => {
    // The marker is stored capitalised, so the composed name differs by case — left untouched.
    const p = proposePartsSplit({ name: 'Иванов Иван Бен Александр' }, 'surname-first');
    assert.equal(p.reason, 'identity-mismatch');
    assert.equal(p.surname, undefined);
  });
  it('reports the other reason codes', () => {
    assert.equal(proposePartsSplit({ name: '' }, 'surname-first').reason, 'empty-name');
    assert.equal(proposePartsSplit({ name: 'Иванов Иван бен' }, 'surname-first').reason, 'empty-part');
    assert.equal(proposePartsSplit({ name: 'Иван бен Александр בן משה' }, 'surname-first').reason, 'multi-marker');
    assert.equal(proposePartsSplit({ name: 'Либерман Абрам бен?' }, 'surname-first').reason, 'shape');
    assert.equal(proposePartsSplit({ name: 'Абрам Либерман' }, 'surname-first').reason, 'shape');
    // A plain split name without a parent part keeps only the given-name words.
    const plain = proposePartsSplit({ name: 'Либерман Абрам' }, 'surname-first');
    assert.equal(plain.givenName, 'Абрам');
    Object.keys({ ...plain }).forEach((key) => assert.ok(key !== 'reason'));
  });
  it('reports nothing to do for a row that is already in parts', () => {
    const done = proposePartsSplit({
      name: 'Иванов Иван бен Александр', surname: 'Иванов', givenName: 'Иван', parentName: 'Александр', parentRelation: 'ben',
    }, 'surname-first');
    assert.equal(done.alreadyDone, true);
    assert.equal(proposePartsSplit({ name: 'Либерман Абрам', surname: 'Либерман', givenName: 'Абрам' }, 'surname-first').alreadyDone, true);
  });
  it('only reports known reason codes', () => {
    const proposals = [
      proposePartsSplit({ name: '' }, ''),
      proposePartsSplit({ name: 'Иванов Иван бен' }, 'surname-first'),
      proposePartsSplit({ name: 'Иван бен Александр בן משה' }, 'surname-first'),
      proposePartsSplit({ name: 'Иванов Иван Бен Александр' }, 'surname-first'),
      proposePartsSplit({ name: 'Абрам Либерман' }, 'surname-first'),
    ];
    proposals.forEach((p) => assert.ok(PARTS_REASONS.includes(p.reason), p.reason));
    assert.deepEqual(splitAtMarker('Иван бен Александр (Сендер)'), {
      givenName: 'Иван', parentName: 'Александр (Сендер)', parentRelation: 'ben',
    });
  });
});

describe('1.41.0 I89: split-parts, given-first community', () => {
  it('keeps the order when composing', () => {
    const p = proposePartsSplit({ name: 'Иван Иванов бен Александр', surname: 'Иванов', givenName: 'Иван бен Александр' }, 'given-first');
    assert.equal(p.surname, 'Иванов');
    assert.equal(p.givenName, 'Иван');
    assert.equal(p.parentName, 'Александр');
    assert.equal(composePersonName(p, 'given-first'), 'Иван Иванов бен Александр');
  });
});

describe('1.41.0 I89: the Torah reading never changes', () => {
  it('keeps torahReadingName identical for a row whose surname is already apart', () => {
    const person = { name: 'Иванов Иван бен Александр', surname: 'Иванов', givenName: 'Иван бен Александр' };
    const p = proposePartsSplit(person, 'surname-first');
    assert.equal(torahReadingName(p), torahReadingName(person));
  });
  it('keeps torahReadingName identical for a partial row with no surname', () => {
    const person = { name: 'כהן אברהם בן יצחק' };
    const p = proposePartsSplit(person, 'surname-first');
    assert.equal(p.surname, '');
    assert.equal(torahReadingName(p), torahReadingName(person));
  });
  it('reads a newly separated unsplit row exactly like the 1.40.0 surname split would', () => {
    // 1.40.0 drops the surname from the reading, so the reading after this rule must be the same
    // string the surname-split row would read.
    const person = { name: 'Либерман Сара бат Моисей' };
    const p = proposePartsSplit(person, 'surname-first');
    assert.equal(p.surname, 'Либерман');
    assert.equal(torahReadingName(p), 'Сара бат Моисей');
    assert.equal(torahReadingName({ name: person.name, surname: 'Либерман', givenName: 'Сара бат Моисей' }), 'Сара бат Моисей');
  });
});

describe('1.41.0 I89: the rule is wired everywhere', () => {
  const fs = require('fs');
  const path = require('path');
  const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

  it('is in the runner rule list', () => {
    assert.ok(RULES.includes('split-parts'));
    assert.deepEqual(RULES, [
      'ben-bat', 'patronymic', 'drop-patronymic-dup', 'nominative-parents', 'split-surname', 'split-parts',
    ]);
  });
  it('is in the manual workflow choice options and description', () => {
    const wf = read('.github/workflows/name-normalization.yml');
    assert.match(wf, /options: \[[^\]]*split-parts\]/);
    assert.match(wf, /split-parts \(/);
  });
  it('is in the CLI rule list and the encrypted CSV has the new columns', () => {
    const script = read('scripts/run-name-normalization.js');
    assert.match(script, /--rule=ben-bat\|patronymic\|drop-patronymic-dup\|nominative-parents\|split-surname\|split-parts/);
    assert.match(script, /'parent_name', 'parent_relation'/);
    assert.match(script, /r\.parentName \|\| ''/);
  });
  it('is accepted by the master endpoint allow-list', () => {
    const master = read('routes/master.js');
    assert.match(master, /const \{ runNameNormalization, RULES \} = require\('\.\.\/lib\/name-normalization-run'\)/);
    assert.match(master, /RULES\.includes\(String\(req\.body\.rule\)\)/);
  });
});

describe('1.41.0 I89: split-parts in the normalization run', () => {
  const SEED = [
    { slug: 'split', people: [
      // 1.40.0 already split this one; the marker is still inside givenName.
      { id: 1, name: 'Иванов Иван бен Александр', surname: 'Иванов', givenName: 'Иван бен Александр' },
      // Fully unsplit: the surname comes from the 1.40.0 rule.
      { id: 2, name: 'Либерман Сара бат Моисей' },
      // Ambiguous surname, one clean marker: parent part only.
      { id: 3, name: 'כהן אברהם בן יצחק' },
      // Two markers: nothing this rule can decide.
      { id: 4, name: 'Иван бен Александр בן משה' },
    ] },
    { slug: 'done', people: [
      { id: 1, name: 'Иванов Иван бен Александр', surname: 'Иванов', givenName: 'Иван', parentName: 'Александр', parentRelation: 'ben' },
    ] },
  ];

  it('dry-run reports {total, written, partial, alreadyDone, ambiguous} and a byReason map', async () => {
    const db = fakeDb(SEED);
    const dry = await runNameNormalization(db, { mode: 'dry-run', rule: 'split-parts' });
    assert.deepEqual(dry.summary.byCommunity.split, { total: 4, written: 3, partial: 1, alreadyDone: 0, ambiguous: 1 });
    assert.deepEqual(dry.summary.byCommunity.done, { total: 1, written: 0, partial: 0, alreadyDone: 1, ambiguous: 0 });
    assert.equal(dry.summary.written, 3);
    assert.equal(dry.summary.partial, 1);
    assert.equal(dry.summary.alreadyDone, 1);
    assert.equal(dry.summary.ambiguous, 1);
    assert.equal(dry.summary.byReason['multi-marker'], 1);
    assert.equal(typeof dry.summary.byReason, 'object');
    assert.equal(db.data.synagogues[0].people[1].givenName, undefined, 'dry-run writes nothing');
  });

  it('apply writes the parts, keeps `name` byte-identical and uses the sp- runId prefix', async () => {
    assert.match(newRunId(new Date('2026-11-16T09:10:11Z'), 'sp'), /^sp-20261116T091011-[0-9a-f]{6}$/);
    assert.match(RULES.includes('split-parts') ? 'ok' : '', /ok/);

    const db = fakeDb(SEED);
    const res = await runNameNormalization(db, { mode: 'apply', rule: 'split-parts' });
    assert.match(res.runId, /^sp-/);
    assert.equal(res.updated, 3);

    const [split, done] = db.data.synagogues;
    assert.equal(split.people[0].name, 'Иванов Иван бен Александр');
    assert.equal(split.people[0].surname, 'Иванов');
    assert.equal(split.people[0].givenName, 'Иван');
    assert.equal(split.people[0].parentName, 'Александр');
    assert.equal(split.people[0].parentRelation, 'ben');

    assert.equal(split.people[1].name, 'Либерман Сара бат Моисей');
    assert.equal(split.people[1].surname, 'Либерман');
    assert.equal(split.people[1].givenName, 'Сара');
    assert.equal(split.people[1].parentName, 'Моисей');
    assert.equal(split.people[1].parentRelation, 'bat');

    assert.equal(split.people[2].surname, '', 'ambiguous surname stays empty');
    assert.equal(split.people[2].givenName, 'כהן אברהם');
    assert.equal(split.people[2].parentName, 'יצחק');
    assert.equal(split.people[2].parentRelation, 'ben');

    assert.equal(done.people[0].givenName, 'Иван', 'an already-finished row is untouched');
    assert.equal(done.people[0].parentName, 'Александр');
  });

  it('backup records the previous parts and restore puts them back exactly', async () => {
    const db = fakeDb(SEED);
    const res = await runNameNormalization(db, { mode: 'apply', rule: 'split-parts' });
    const b = db.data[BACKUP_COLLECTION].find((x) => x.community === 'split' && x.personId === 1);
    assert.equal(b.oldSurname, 'Иванов');
    assert.equal(b.oldGivenName, 'Иван бен Александр');
    assert.equal(b.oldParentName, '');
    assert.equal(b.oldParentRelation, '');
    assert.equal(b.newGivenName, 'Иван');
    assert.equal(b.newParentName, 'Александр');
    assert.equal(b.newParentRelation, 'ben');
    assert.ok(b.runId.startsWith('sp-'));

    const back = await restoreNormalization(db.collection('synagogues'), db.collection(BACKUP_COLLECTION), res.runId);
    assert.equal(back.restored, 3);
    const [split] = db.data.synagogues;
    // The 1.40.0 split row goes back to exactly what it held before this run.
    assert.equal(split.people[0].surname, 'Иванов');
    assert.equal(split.people[0].givenName, 'Иван бен Александр');
    assert.equal(split.people[0].parentName, '');
    assert.equal(split.people[0].parentRelation, '');
    assert.equal(split.people[0].name, 'Иванов Иван бен Александр');
    // The unsplit row goes back to a fully unsplit row.
    assert.equal(split.people[1].surname, '');
    assert.equal(split.people[1].givenName, '');
    assert.equal(split.people[1].parentName, '');
    assert.equal(split.people[1].parentRelation, '');
  });

  it('a second run finds nothing to write', async () => {
    const db = fakeDb(SEED);
    await runNameNormalization(db, { mode: 'apply', rule: 'split-parts' });
    const dry = await runNameNormalization(db, { mode: 'dry-run', rule: 'split-parts' });
    assert.equal(dry.summary.written, 0);
    assert.equal(dry.summary.alreadyDone, 4);
    const res = await runNameNormalization(db, { mode: 'apply', rule: 'split-parts' });
    assert.equal(res.updated, 0);
  });

  it('is reachable through planNormalization and rejects an unknown rule', async () => {
    const synagogues = { find: () => ({ toArray: async () => [{ slug: 'x', people: [{ id: 1, name: 'Иванов Иван бен Александр' }] }] }) };
    const { summary } = await planNormalization(synagogues, { rule: 'split-parts' });
    assert.equal(summary.written, 1);
    await assert.rejects(
      () => runNameNormalization(fakeDb([]), { mode: 'dry-run', rule: 'nope' }),
      /unknown rule/,
    );
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
