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
const { inferGenderCertain } = require('./gender-certain');
const { proposePatronymic } = require('./normalize-patronymic');

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
    kind: 'name',
  };
}

/** 1.36.2: gender-only row for a name with no son/daughter word and no male/female on record. */
function planGenderInference(person) {
  const rawGender = person.gender == null ? '' : String(person.gender);
  if (rawGender === 'male' || rawGender === 'female') return null;
  const name = String(person.name || '');
  if (!name.trim()) return null;
  const { gender, reason } = inferGenderCertain(name);
  return {
    id: person.id,
    oldName: name,
    newName: name,
    oldGender: rawGender,
    newGender: gender || rawGender,
    rule: gender ? `gender inferred: ${gender}` : 'gender uncertain',
    ambiguous: false,
    uncertain: !gender,
    note: reason,
    kind: 'gender',
  };
}

/** 1.37.0 I65: Russian patronymic → бен/бат + father's name (lib/normalize-patronymic). */
function planPatronymic(person, genderFix = '') {
  const fix = genderFix === 'male' || genderFix === 'female' ? genderFix : '';
  const p = proposePatronymic(fix ? { ...person, gender: fix } : person);
  if (!p) return null;
  if (fix) {
    // Explicitly approved gender correction: back up the gender on record, write the approved one.
    const stored = person.gender == null ? '' : String(person.gender);
    return {
      id: person.id, oldName: p.name, newName: p.newName, proposedName: p.proposedName, father: p.father,
      patronymic: p.patronymic, oldGender: stored, newGender: p.uncertain ? stored : fix,
      rule: `patronymic→${p.suffixGender === 'male' ? 'бен' : 'бат'}`, confidence: p.confidence,
      ambiguous: false, uncertain: p.uncertain, note: p.uncertain ? p.note : `gender corrected ${stored || '-'}→${fix}`,
      kind: 'patronymic', genderFixed: !p.uncertain && stored !== fix,
    };
  }
  return {
    id: person.id,
    oldName: p.name,
    newName: p.newName,
    proposedName: p.proposedName,
    father: p.father,
    patronymic: p.patronymic,
    oldGender: p.oldGender,
    newGender: p.uncertain ? p.oldGender : (p.oldGender === 'male' || p.oldGender === 'female' ? p.oldGender : p.newGender),
    rule: `patronymic→${p.suffixGender === 'male' ? 'бен' : 'бат'}`,
    confidence: p.confidence,
    ambiguous: false,
    uncertain: p.uncertain,
    note: p.note,
    kind: 'patronymic',
  };
}

async function planPatronymicNormalization(synagogues, opts = {}) {
  const slug = opts.slug || '';
  const docs = await synagogues
    .find(slug ? { slug } : {}, { projection: { slug: 1, 'people.id': 1, 'people.name': 1, 'people.gender': 1 } })
    .toArray();
  const rows = [];
  const summary = {
    rule: 'patronymic', communities: docs.length, people: 0, nameChanges: 0, genderSet: 0, genderFixed: 0, skippedUncertain: 0,
    byCommunity: {}, byConfidence: {},
  };
  for (const doc of docs) {
    const c = summary.byCommunity[doc.slug] = { people: 0, converted: 0, genderSet: 0, uncertain: 0 };
    for (const person of doc.people || []) {
      summary.people += 1; c.people += 1;
      const row = planPatronymic(person, (opts.genderFix || {})[`${doc.slug}:${person.id}`]);
      if (!row) continue;
      row.community = doc.slug;
      rows.push(row);
      summary.byConfidence[row.confidence] = (summary.byConfidence[row.confidence] || 0) + 1;
      if (row.uncertain) { summary.skippedUncertain += 1; c.uncertain += 1; continue; }
      summary.nameChanges += 1; c.converted += 1;
      if (row.genderFixed) { summary.genderFixed += 1; c.genderFixed = (c.genderFixed || 0) + 1; } else if (row.newGender !== row.oldGender) { summary.genderSet += 1; c.genderSet += 1; }
    }
  }
  return { summary, rows };
}

async function planNormalization(synagogues, opts = {}) {
  if (opts.rule === 'patronymic') return planPatronymicNormalization(synagogues, opts);
  const slug = opts.slug || '';
  const filter = slug ? { slug } : {};
  const docs = await synagogues
    .find(filter, { projection: { slug: 1, 'people.id': 1, 'people.name': 1, 'people.gender': 1 } })
    .toArray();
  const rows = [];
  const summary = {
    communities: docs.length, people: 0, nameChanges: 0, genderSet: 0, skippedAmbiguous: 0,
    byCommunity: {}, byRule: {},
    genderInferred: { male: 0, female: 0 }, genderUncertain: 0, genderInferredByCommunity: {},
  };
  for (const doc of docs) {
    for (const person of doc.people || []) {
      summary.people += 1;
      let row = planPerson(person);
      if (!row && opts.inferGender !== false) {
        const g = planGenderInference(person);
        if (g) {
          g.community = doc.slug;
          rows.push(g);
          if (g.uncertain) summary.genderUncertain += 1;
          else {
            summary.genderInferred[g.newGender] += 1;
            summary.genderInferredByCommunity[doc.slug] = (summary.genderInferredByCommunity[doc.slug] || 0) + 1;
          }
        }
        continue;
      }
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
  const todo = rows.filter((r) => !r.ambiguous && !r.uncertain);
  if (todo.length) {
    await backups.insertMany(todo.map((r) => ({
      runId, createdAt: now, community: r.community, personId: r.id,
      oldName: r.oldName, oldGender: r.oldGender, newName: r.newName, newGender: r.newGender, rule: r.rule,
      kind: r.kind,
    })));
  }
  let updated = 0;
  const touched = new Set();
  for (const r of todo) {
    const set = {};
    if (r.newName !== r.oldName) set['people.$[p].name'] = r.newName;
    if (r.newGender !== r.oldGender) set['people.$[p].gender'] = r.newGender;
    if (!Object.keys(set).length) continue;
    const filter = { 'p.id': r.id, 'p.name': r.oldName };
    // An empty gender may be stored as '' or be missing altogether (null matches both).
    if (r.kind === 'gender' || (r.kind === 'patronymic' && set['people.$[p].gender'])) {
      filter['p.gender'] = r.oldGender ? r.oldGender : { $in: ['', null] };
    }
    // eslint-disable-next-line no-await-in-loop
    const res = await synagogues.updateOne(
      { slug: r.community },
      { $set: set },
      { arrayFilters: [filter] },
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
    const set = {};
    if (b.newName !== b.oldName) set['people.$[p].name'] = b.oldName;
    if (b.newGender !== b.oldGender) set['people.$[p].gender'] = b.oldGender;
    if (!Object.keys(set).length) continue;
    const filter = { 'p.id': b.personId, 'p.name': b.newName };
    if (b.kind === 'gender') filter['p.gender'] = b.newGender;
    // eslint-disable-next-line no-await-in-loop
    const res = await synagogues.updateOne(
      { slug: b.community },
      { $set: set },
      { arrayFilters: [filter] },
    );
    if (res && res.modifiedCount) { restored += res.modifiedCount; touched.add(b.community); }
  }
  return { runId, backups: saved.length, restored, communities: [...touched] };
}

/** Dispatch by mode: 'dry-run' | 'apply' | 'restore'. */
async function runNameNormalization(db, {
  mode = 'dry-run', runId = '', slug = '', inferGender = true, rule = 'ben-bat', genderFix = {},
} = {}) {
  if (!['ben-bat', 'patronymic'].includes(rule)) throw new Error(`unknown rule: ${rule}`);
  const synagogues = db.collection('synagogues');
  const backups = db.collection(BACKUP_COLLECTION);
  if (mode === 'dry-run') return { mode, rule, ...(await planNormalization(synagogues, { slug, inferGender, rule, genderFix })) };
  if (mode === 'apply') return { mode, rule, ...(await applyNormalization(synagogues, backups, { slug, inferGender, rule, genderFix })) };
  if (mode === 'restore') return { mode, ...(await restoreNormalization(synagogues, backups, runId)) };
  throw new Error(`unknown mode: ${mode}`);
}

module.exports = {
  BACKUP_COLLECTION,
  planPerson,
  planGenderInference,
  planPatronymic,
  planNormalization,
  applyNormalization,
  restoreNormalization,
  runNameNormalization,
  newRunId,
};
