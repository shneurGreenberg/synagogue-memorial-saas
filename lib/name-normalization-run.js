/**
 * 1.36.1 I64: run the сын/дочь → бен/бат normalisation (lib/normalize-ben-bat) against the database,
 * with a dry-run mode, an apply mode that backs up every changed person first, and restore by runId.
 *
 * Only the name word is rewritten (rules in proposeBenBat). Gender is written only when the record
 * has none and the son/daughter word itself says male/female. Rows with a name conflict or more than
 * one marker (`ambiguous`) are reported, never applied. Gender-only proposals (inferred from the name
 * without a son/daughter word) are ignored here.
 *
 * Works with any MongoDB-driver-like collection (find().toArray(), updateOne, insertMany) so tests can
 * pass in-memory fakes.
 */
const crypto = require('crypto');
const { proposeBenBat } = require('./normalize-ben-bat');

const BACKUP_COLLECTION = 'name_normalization_backups';
const MARKER_RULE = /^[^→]+→(бен|бат|בן|בת|ben|bat)$/;

function planPerson(person) {
  const p = proposeBenBat(person);
  if (!p || p.newName === p.name) return null;
  if (!MARKER_RULE.test(p.rule)) return null;
  const rawGender = person.gender == null ? '' : String(person.gender);
  const hasGender = rawGender === 'male' || rawGender === 'female';
  const markerGender = /→(бен|בן|ben)$/.test(p.rule) ? 'male' : 'female';
  return {
    id: person.id,
    oldName: p.name,
    newName: p.newName,
    oldGender: rawGender,
    newGender: hasGender ? rawGender : markerGender,
    rule: p.rule,
    ambiguous: !!p.ambiguous,
    note: p.note || '',
  };
}

async function planNormalization(synagogues, { slug = '' } = {}) {
  const filter = slug ? { slug } : {};
  const docs = await synagogues
    .find(filter, { projection: { slug: 1, 'people.id': 1, 'people.name': 1, 'people.gender': 1 } })
    .toArray();
  const rows = [];
  const summary = {
    communities: docs.length, people: 0, nameChanges: 0, genderSet: 0, skippedAmbiguous: 0,
    byCommunity: {}, byRule: {},
  };
  for (const doc of docs) {
    for (const person of doc.people || []) {
      summary.people += 1;
      const row = planPerson(person);
      if (!row) continue;
      row.community = doc.slug;
      rows.push(row);
      if (row.ambiguous) { summary.skippedAmbiguous += 1; continue; }
      summary.nameChanges += 1;
      if (row.newGender !== row.oldGender) summary.genderSet += 1;
      summary.byCommunity[doc.slug] = (summary.byCommunity[doc.slug] || 0) + 1;
      summary.byRule[row.rule] = (summary.byRule[row.rule] || 0) + 1;
    }
  }
  return { summary, rows };
}

function newRunId(now = new Date()) {
  return `bb-${now.toISOString().replace(/[-:]/g, '').replace(/\..*$/, '')}-${crypto.randomBytes(3).toString('hex')}`;
}

/**
 * Apply: write a backup document per changed person (runId, timestamp, old/new name+gender), then
 * update each person only if its name is still the old one (no clobbering concurrent edits).
 */
async function applyNormalization(synagogues, backups, opts = {}) {
  const now = opts.now || new Date();
  const runId = opts.runId || newRunId(now);
  const { summary, rows } = await planNormalization(synagogues, opts);
  const todo = rows.filter((r) => !r.ambiguous);
  if (todo.length) {
    await backups.insertMany(todo.map((r) => ({
      runId, createdAt: now, community: r.community, personId: r.id,
      oldName: r.oldName, oldGender: r.oldGender, newName: r.newName, newGender: r.newGender, rule: r.rule,
    })));
  }
  let updated = 0;
  const touched = new Set();
  for (const r of todo) {
    const set = { 'people.$[p].name': r.newName };
    if (r.newGender !== r.oldGender) set['people.$[p].gender'] = r.newGender;
    // eslint-disable-next-line no-await-in-loop
    const res = await synagogues.updateOne(
      { slug: r.community },
      { $set: set },
      { arrayFilters: [{ 'p.id': r.id, 'p.name': r.oldName }] },
    );
    if (res && res.modifiedCount) { updated += res.modifiedCount; touched.add(r.community); }
  }
  return { runId, summary, updated, communities: [...touched], rows };
}

/** Restore names/genders saved by a run, only where the record still holds the value that run wrote. */
async function restoreNormalization(synagogues, backups, runId) {
  if (!runId) throw new Error('runId is required');
  const saved = await backups.find({ runId }).toArray();
  let restored = 0;
  const touched = new Set();
  for (const b of saved) {
    const set = { 'people.$[p].name': b.oldName };
    if (b.newGender !== b.oldGender) set['people.$[p].gender'] = b.oldGender;
    // eslint-disable-next-line no-await-in-loop
    const res = await synagogues.updateOne(
      { slug: b.community },
      { $set: set },
      { arrayFilters: [{ 'p.id': b.personId, 'p.name': b.newName }] },
    );
    if (res && res.modifiedCount) { restored += res.modifiedCount; touched.add(b.community); }
  }
  return { runId, backups: saved.length, restored, communities: [...touched] };
}

/** Dispatch by mode: 'dry-run' | 'apply' | 'restore'. */
async function runNameNormalization(db, { mode = 'dry-run', runId = '', slug = '' } = {}) {
  const synagogues = db.collection('synagogues');
  const backups = db.collection(BACKUP_COLLECTION);
  if (mode === 'dry-run') return { mode, ...(await planNormalization(synagogues, { slug })) };
  if (mode === 'apply') return { mode, ...(await applyNormalization(synagogues, backups, { slug })) };
  if (mode === 'restore') return { mode, ...(await restoreNormalization(synagogues, backups, runId)) };
  throw new Error(`unknown mode: ${mode}`);
}

module.exports = {
  BACKUP_COLLECTION,
  planPerson,
  planNormalization,
  applyNormalization,
  restoreNormalization,
  runNameNormalization,
  newRunId,
};
