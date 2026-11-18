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
const { proposePatronymic, proposeDropPatronymicDup } = require('./normalize-patronymic');
const { proposeNominativeParents } = require('./nominative-name');
const { detectNameOrder, normalizeNameOrder } = require('./person-name');
const { proposeSurnameSplit, buildGivenAtPos } = require('./split-surname');
const { proposePartsSplit } = require('./split-name-parts');
const { proposeParts2Split, buildParts2Context } = require('./split-name-parts-2');

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

/** 1.36.5 I66: drop the Russian patronymic where the name already has бен/бат + father. */
function planDropPatronymicDup(person) {
  const p = proposeDropPatronymicDup(person);
  if (!p) return null;
  const g = person.gender == null ? '' : String(person.gender);
  return {
    id: person.id, oldName: p.name, newName: p.newName, proposedName: p.proposedName, patronymic: p.patronymic,
    father: '', oldGender: g, newGender: g, rule: 'drop-patronymic-dup', confidence: p.uncertain ? 'uncertain' : 'high',
    ambiguous: false, uncertain: p.uncertain, note: p.note, kind: 'patronymic-dup',
  };
}

/** I87: parent names after бен/бат from the genitive to the nominative («бен Александра» → «бен Александр»). */
// An uncertain row is applied (as its suggestion) only when its slug:id is in the approved list.
function planNominativeParents(person, approved = false) {
  const p = proposeNominativeParents(person);
  if (!p) return null;
  const g = person.gender == null ? '' : String(person.gender);
  const take = p.uncertain && approved && p.proposedName !== p.name;
  const uncertain = p.uncertain && !take;
  return {
    id: person.id, oldName: p.name, newName: take ? p.proposedName : p.newName, proposedName: p.proposedName, father: '', patronymic: '',
    oldGender: g, newGender: g, rule: 'nominative-parents', confidence: take ? 'approved' : (uncertain ? 'uncertain' : 'high'),
    ambiguous: false, uncertain, note: (take ? 'approved by id; ' : '') + (p.note || p.changes.map((c) => `${c.from}→${c.to}`).join(', ')),
    kind: 'nominative-parents',
  };
}

/**
 * 1.40.0 I88: split the surname out of an existing display name (lib/split-surname).
 *
 * The community convention comes from the saved `nameOrder`, otherwise from detectNameOrder over
 * its people names. Confident rows get surname + givenName and `name` stays byte-identical; the
 * detected order is saved on the community when no order was stored yet. Rows that cannot be
 * split safely are reported with a reason code and left untouched.
 */
async function planSplitSurnameNormalization(synagogues, opts = {}) {
  const slug = opts.slug || '';
  const docs = await synagogues
    .find(slug ? { slug } : {}, { projection: { slug: 1, nameOrder: 1, 'people.id': 1, 'people.name': 1, 'people.surname': 1, 'people.givenName': 1, 'people.gender': 1 } })
    .toArray();
  const rows = [];
  const summary = {
    rule: 'split-surname', communities: docs.length, people: 0, split: 0, ambiguous: 0, alreadySplit: 0, nameOrderSet: 0,
    byCommunity: {}, byReason: {},
  };
  for (const doc of docs) {
    const people = doc.people || [];
    const detected = detectNameOrder(people.map((person) => (person && person.name) || ''));
    const saved = normalizeNameOrder(doc.nameOrder);
    // A saved setting always wins for the split; the report shows the detected convention when
    // there is one, so the admin can compare it with what the community stored.
    const order = saved || detected;
    const reported = detected || saved;
    // Written only where the community has no order yet, and only once something is actually split.
    const orderToSet = !saved && order ? order : '';
    // 1.40.1: the community's own given-name evidence, collected once per community and passed to
    // every row so a surname the community also uses as a given name (Анна, Лев, Нина) is not split.
    const ctx = { givenAtPos: buildGivenAtPos(people.map((person) => (person && person.name) || ''), order) };
    const counts = summary.byCommunity[doc.slug] = { total: people.length, split: 0, ambiguous: 0, alreadySplit: 0, order: reported };
    summary.people += people.length;
    for (const person of people) {
      const name = String((person && person.name) || '');
      const gender = person && person.gender != null ? String(person.gender) : '';
      const proposal = proposeSurnameSplit(person, order, ctx);
      if (proposal.alreadySplit) {
        summary.alreadySplit += 1; counts.alreadySplit += 1;
        continue;
      }
      if (proposal.reason) {
        summary.ambiguous += 1; counts.ambiguous += 1;
        summary.byReason[proposal.reason] = (summary.byReason[proposal.reason] || 0) + 1;
        rows.push({
          id: person.id, community: doc.slug, oldName: name, newName: name, surname: '', givenName: '',
          oldGender: gender, newGender: gender, rule: 'split-surname', confidence: 'ambiguous',
          ambiguous: true, uncertain: false, note: proposal.reason, kind: 'split-surname',
        });
        continue;
      }
      summary.split += 1; counts.split += 1;
      rows.push({
        id: person.id, community: doc.slug, oldName: name, newName: name,
        surname: proposal.surname, givenName: proposal.givenName,
        oldGender: gender, newGender: gender, rule: 'split-surname', confidence: 'high',
        ambiguous: false, uncertain: false, note: order, kind: 'split-surname',
        oldNameOrder: orderToSet ? '' : saved, newNameOrder: orderToSet ? order : '',
      });
    }
    if (orderToSet && counts.split) summary.nameOrderSet += 1;
  }
  return { summary, rows };
}

/**
 * 1.41.0 I89: complete the split — surname, givenName (given words only), parentName, parentRelation.
 * Builds on the 1.40.0 surname split (lib/split-name-parts): rows it already split keep their marker
 * inside givenName, unsplit rows get the surname first when that is confident, and a row whose
 * surname stays ambiguous can still get its parent part (partial, surname empty). `name` is never
 * changed. Nothing is counted as written unless the composed name and the Torah reading both match.
 */
async function planSplitPartsNormalization(synagogues, opts = {}) {
  const slug = opts.slug || '';
  const docs = await synagogues
    .find(slug ? { slug } : {}, {
      projection: {
        slug: 1, nameOrder: 1, 'people.id': 1, 'people.name': 1, 'people.surname': 1, 'people.givenName': 1,
        'people.parentName': 1, 'people.parentRelation': 1, 'people.gender': 1,
      },
    })
    .toArray();
  const rows = [];
  const summary = {
    rule: 'split-parts', communities: docs.length, people: 0, written: 0, partial: 0, alreadyDone: 0, ambiguous: 0,
    nameOrderSet: 0, byCommunity: {}, byReason: {}, orders: {},
  };
  for (const doc of docs) {
    const people = doc.people || [];
    const detected = detectNameOrder(people.map((person) => (person && person.name) || ''));
    const saved = normalizeNameOrder(doc.nameOrder);
    const order = saved || detected;
    const orderToSet = !saved && order ? order : '';
    const ctx = { givenAtPos: buildGivenAtPos(people.map((person) => (person && person.name) || ''), order) };
    // The convention each community is split with (its saved setting, otherwise what its names show).
    summary.orders[doc.slug] = detected || saved;
    const counts = summary.byCommunity[doc.slug] = {
      total: people.length, written: 0, partial: 0, alreadyDone: 0, ambiguous: 0,
    };
    summary.people += people.length;
    for (const person of people) {
      const name = String((person && person.name) || '');
      const gender = person && person.gender != null ? String(person.gender) : '';
      const proposal = proposePartsSplit(person, order, ctx);
      if (proposal.alreadyDone) {
        summary.alreadyDone += 1; counts.alreadyDone += 1;
        continue;
      }
      if (proposal.reason) {
        summary.ambiguous += 1; counts.ambiguous += 1;
        summary.byReason[proposal.reason] = (summary.byReason[proposal.reason] || 0) + 1;
        rows.push({
          id: person.id, community: doc.slug, oldName: name, newName: name,
          oldSurname: String(person.surname || ''), oldGivenName: String(person.givenName || ''),
          oldParentName: String(person.parentName || ''), oldParentRelation: String(person.parentRelation || ''),
          surname: '', givenName: '', parentName: '', parentRelation: '',
          oldGender: gender, newGender: gender, rule: 'split-parts', confidence: 'ambiguous',
          ambiguous: true, uncertain: false, partial: false, note: proposal.reason, kind: 'split-parts',
        });
        continue;
      }
      summary.written += 1; counts.written += 1;
      if (proposal.partial) { summary.partial += 1; counts.partial += 1; }
      rows.push({
        id: person.id, community: doc.slug, oldName: name, newName: name,
        oldSurname: String(person.surname || ''), oldGivenName: String(person.givenName || ''),
        oldParentName: String(person.parentName || ''), oldParentRelation: String(person.parentRelation || ''),
        surname: proposal.surname, givenName: proposal.givenName,
        parentName: proposal.parentName, parentRelation: proposal.parentRelation,
        oldGender: gender, newGender: gender, rule: 'split-parts',
        confidence: proposal.partial ? 'partial' : 'high',
        ambiguous: false, uncertain: false, partial: !!proposal.partial, note: proposal.note || order,
        kind: 'split-parts',
        oldNameOrder: orderToSet ? '' : saved, newNameOrder: orderToSet ? order : '',
      });
    }
    if (orderToSet && counts.written) summary.nameOrderSet += 1;
  }
  return { summary, rows };
}

/**
 * 1.42.0 I93: surname still empty after split-parts — maiden parenthesis, dashed double surname,
 * two known given names, and Hebrew surname-last. `name` is never changed. A community with no
 * saved order is stored as surname-last only when that is how its names compose.
 * Left alone: a marker that sits only inside brackets ('marker-in-brackets'), three words before
 * the marker when the middle token is not a given name on its own ('double-surname-no-dash':
 * the row's own tokens are ignored, and a second surname still does not count when one other row
 * or a surname shape makes it look like a given name), and a
 * Hebrew surname-last row that already starts with another row's trailing surname
 * ('hebrew-leading-surname').
 */
async function planSplitParts2Normalization(synagogues, opts = {}) {
  const slug = opts.slug || '';
  const docs = await synagogues
    .find(slug ? { slug } : {}, {
      projection: {
        slug: 1, nameOrder: 1, 'people.id': 1, 'people.name': 1, 'people.surname': 1, 'people.givenName': 1,
        'people.parentName': 1, 'people.parentRelation': 1, 'people.gender': 1,
      },
    })
    .toArray();
  const rows = [];
  const summary = {
    rule: 'split-parts-2', communities: docs.length, people: 0, written: 0, alreadyDone: 0, ambiguous: 0,
    nameOrderSet: 0, byCommunity: {}, byReason: {}, orders: {},
  };
  for (const doc of docs) {
    const people = doc.people || [];
    const detected = detectNameOrder(people.map((person) => (person && person.name) || ''));
    const saved = normalizeNameOrder(doc.nameOrder);
    const built = buildParts2Context(people, (saved || detected) === 'given-first' ? 'given-first' : 'surname-first');
    const keepSaved = saved === 'surname-first' || saved === 'given-first' || saved === 'surname-last';
    const order = keepSaved ? saved : (built.surnameLast ? 'surname-last' : (detected || ''));
    const ctx = { ...built, surnameLast: order === 'surname-last' && built.surnameLast };
    const orderToSet = !saved && order === 'surname-last' ? 'surname-last' : '';
    summary.orders[doc.slug] = order || detected || saved;
    const counts = summary.byCommunity[doc.slug] = {
      total: people.length, written: 0, ambiguous: 0, alreadyDone: 0,
    };
    summary.people += people.length;
    for (const person of people) {
      const name = String((person && person.name) || '');
      const gender = person && person.gender != null ? String(person.gender) : '';
      const proposal = proposeParts2Split(person, order, ctx);
      if (proposal.alreadyDone) {
        summary.alreadyDone += 1; counts.alreadyDone += 1;
        continue;
      }
      if (proposal.reason) {
        summary.ambiguous += 1; counts.ambiguous += 1;
        summary.byReason[proposal.reason] = (summary.byReason[proposal.reason] || 0) + 1;
        rows.push({
          id: person.id, community: doc.slug, oldName: name, newName: name,
          oldSurname: String(person.surname || ''), oldGivenName: String(person.givenName || ''),
          oldParentName: String(person.parentName || ''), oldParentRelation: String(person.parentRelation || ''),
          surname: '', givenName: '', parentName: '', parentRelation: '',
          oldGender: gender, newGender: gender, rule: 'split-parts-2', confidence: 'ambiguous',
          ambiguous: true, uncertain: false, partial: false, note: proposal.reason, kind: 'split-parts-2',
        });
        continue;
      }
      summary.written += 1; counts.written += 1;
      rows.push({
        id: person.id, community: doc.slug, oldName: name, newName: name,
        oldSurname: String(person.surname || ''), oldGivenName: String(person.givenName || ''),
        oldParentName: String(person.parentName || ''), oldParentRelation: String(person.parentRelation || ''),
        surname: proposal.surname, givenName: proposal.givenName,
        parentName: proposal.parentName, parentRelation: proposal.parentRelation,
        oldGender: gender, newGender: gender, rule: 'split-parts-2',
        confidence: 'high',
        ambiguous: false, uncertain: false, partial: false, note: proposal.note || order,
        kind: 'split-parts-2',
        oldNameOrder: orderToSet ? '' : saved, newNameOrder: orderToSet ? order : '',
      });
    }
    if (orderToSet && counts.written) summary.nameOrderSet += 1;
  }
  return { summary, rows };
}

async function planPatronymicNormalization(synagogues, opts = {}) {
  const slug = opts.slug || '';
  const docs = await synagogues
    .find(slug ? { slug } : {}, { projection: { slug: 1, 'people.id': 1, 'people.name': 1, 'people.gender': 1 } })
    .toArray();
  const rows = [];
  const summary = {
    rule: opts.rule || 'patronymic', communities: docs.length, people: 0, nameChanges: 0, genderSet: 0, genderFixed: 0, skippedUncertain: 0,
    byCommunity: {}, byConfidence: {},
  };
  for (const doc of docs) {
    const c = summary.byCommunity[doc.slug] = { people: 0, converted: 0, genderSet: 0, uncertain: 0 };
    for (const person of doc.people || []) {
      summary.people += 1; c.people += 1;
      const row = opts.rule === 'nominative-parents' ? planNominativeParents(person, (opts.approve || []).includes(`${doc.slug}:${person.id}`)) : opts.rule === 'drop-patronymic-dup'
        ? planDropPatronymicDup(person)
        : planPatronymic(person, (opts.genderFix || {})[`${doc.slug}:${person.id}`]);
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
  if (opts.rule === 'patronymic' || opts.rule === 'drop-patronymic-dup' || opts.rule === 'nominative-parents') return planPatronymicNormalization(synagogues, opts);
  if (opts.rule === 'split-surname') return planSplitSurnameNormalization(synagogues, opts);
  if (opts.rule === 'split-parts') return planSplitPartsNormalization(synagogues, opts);
  if (opts.rule === 'split-parts-2') return planSplitParts2Normalization(synagogues, opts);
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

function newRunId(now = new Date(), prefix = 'bb') {
  return `${prefix}-${now.toISOString().replace(/[-:]/g, '').replace(/\..*$/, '')}-${crypto.randomBytes(3).toString('hex')}`;
}

/**
 * Apply: write a backup document per changed person (runId, timestamp, old/new name+gender), then
 * update each person only if its name is still the old one (no clobbering concurrent edits).
 */
async function applyNormalization(synagogues, backups, opts = {}) {
  const now = opts.now || new Date();
  const rule = opts.rule || 'ben-bat';
  const runId = opts.runId || newRunId(now, rule === 'split-parts-2' ? 'sp2' : rule === 'split-parts' ? 'sp' : 'bb');
  const { summary, rows } = await planNormalization(synagogues, opts);
  const todo = rows.filter((r) => !r.ambiguous && !r.uncertain);
  if (todo.length) {
    await backups.insertMany(todo.map((r) => ({
      runId, createdAt: now, community: r.community, personId: r.id,
      oldName: r.oldName, oldGender: r.oldGender, newName: r.newName, newGender: r.newGender, rule: r.rule,
      kind: r.kind,
      // 1.40.0 I88: a split row also records the surname/givenName it writes and the community's
      // name order before/after, so restore can take all three back.
      ...(r.kind === 'split-surname' ? {
        oldSurname: '', oldGivenName: '', newSurname: r.surname, newGivenName: r.givenName,
        oldNameOrder: r.oldNameOrder || '', newNameOrder: r.newNameOrder || '',
      } : {}),
      // 1.41.0 I89: the parts rule writes surname/givenName/parentName/parentRelation; all four are
      // saved as they were, so restore puts the previous parts back exactly.
      ...(r.kind === 'split-parts' || r.kind === 'split-parts-2' ? {
        oldSurname: r.oldSurname || '', oldGivenName: r.oldGivenName || '',
        oldParentName: r.oldParentName || '', oldParentRelation: r.oldParentRelation || '',
        newSurname: r.surname || '', newGivenName: r.givenName || '',
        newParentName: r.parentName || '', newParentRelation: r.parentRelation || '',
        oldNameOrder: r.oldNameOrder || '', newNameOrder: r.newNameOrder || '',
      } : {}),
    })));
  }
  let updated = 0;
  const touched = new Set();
  const ordersToSet = new Map();
  for (const r of todo) {
    if (r.kind === 'split-surname') {
      // eslint-disable-next-line no-await-in-loop
      const res = await updateSplitPerson(synagogues, r);
      if (res && res.modifiedCount) {
        updated += res.modifiedCount;
        touched.add(r.community);
        if (r.newNameOrder) ordersToSet.set(r.community, r.newNameOrder);
      }
      continue;
    }
    if (r.kind === 'split-parts' || r.kind === 'split-parts-2') {
      // eslint-disable-next-line no-await-in-loop
      const res = await updatePartsPerson(synagogues, r);
      if (res && res.modifiedCount) {
        updated += res.modifiedCount;
        touched.add(r.community);
        if (r.newNameOrder) ordersToSet.set(r.community, r.newNameOrder);
      }
      continue;
    }
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
  // The detected order is saved once per community, and only where the community has none yet.
  for (const [community, order] of ordersToSet) {
    // eslint-disable-next-line no-await-in-loop
    const ord = await synagogues.updateOne(
      { slug: community, nameOrder: { $in: ['', null] } },
      { $set: { nameOrder: order } },
    );
    if (ord && ord.modifiedCount) touched.add(community);
  }
  return { runId, summary, updated, communities: [...touched], rows };
}

/**
 * 1.40.0 I88: write surname + givenName on one person whose `name` is still the old one and which
 * was not split already (an empty or missing surname/givenName matches both).
 */
async function updateSplitPerson(synagogues, row) {
  const unsplit = { $in: ['', null] };
  return synagogues.updateOne(
    { slug: row.community },
    { $set: { 'people.$[p].surname': row.surname, 'people.$[p].givenName': row.givenName } },
    { arrayFilters: [{ 'p.id': row.id, 'p.name': row.oldName, 'p.surname': unsplit, 'p.givenName': unsplit }] },
  );
}

/**
 * 1.41.0 I89: write surname + givenName + parentName + parentRelation on one person whose `name` is
 * still the old one. The row is written only while the stored parts are the ones the plan saw, and
 * `name` is never part of the update.
 */
async function updatePartsPerson(synagogues, row) {
  const samePart = (value) => (value ? value : { $in: ['', null] });
  return synagogues.updateOne(
    { slug: row.community },
    {
      $set: {
        'people.$[p].surname': row.surname,
        'people.$[p].givenName': row.givenName,
        'people.$[p].parentName': row.parentName,
        'people.$[p].parentRelation': row.parentRelation,
      },
    },
    {
      arrayFilters: [{
        'p.id': row.id, 'p.name': row.oldName,
        'p.surname': samePart(row.oldSurname), 'p.givenName': samePart(row.oldGivenName),
        'p.parentName': samePart(row.oldParentName), 'p.parentRelation': samePart(row.oldParentRelation),
      }],
    },
  );
}

/** Restore names/genders saved by a run, only where the record still holds the value that run wrote. */
async function restoreNormalization(synagogues, backups, runId) {
  if (!runId) throw new Error('runId is required');
  const saved = await backups.find({ runId }).toArray();
  let restored = 0;
  const touched = new Set();
  for (const b of saved) {
    if (b.kind === 'split-surname') {
      // 1.40.0 I88: clear surname + givenName, but only where they still hold what the run wrote.
      // eslint-disable-next-line no-await-in-loop
      const res = await synagogues.updateOne(
        { slug: b.community },
        { $set: { 'people.$[p].surname': '', 'people.$[p].givenName': '' } },
        { arrayFilters: [{ 'p.id': b.personId, 'p.surname': b.newSurname || '', 'p.givenName': b.newGivenName || '' }] },
      );
      if (res && res.modifiedCount) { restored += res.modifiedCount; touched.add(b.community); }
      if (b.newNameOrder) {
        // eslint-disable-next-line no-await-in-loop
        const ord = await synagogues.updateOne(
          { slug: b.community, nameOrder: b.newNameOrder },
          { $set: { nameOrder: b.oldNameOrder || '' } },
        );
        if (ord && ord.modifiedCount) touched.add(b.community);
      }
      continue;
    }
    if (b.kind === 'split-parts' || b.kind === 'split-parts-2') {
      // 1.41.0 I89: put the previous surname/givenName/parentName/parentRelation back exactly, but
      // only where they still hold what the run wrote.
      const samePart = (value) => (value ? value : { $in: ['', null] });
      // eslint-disable-next-line no-await-in-loop
      const res = await synagogues.updateOne(
        { slug: b.community },
        {
          $set: {
            'people.$[p].surname': b.oldSurname || '',
            'people.$[p].givenName': b.oldGivenName || '',
            'people.$[p].parentName': b.oldParentName || '',
            'people.$[p].parentRelation': b.oldParentRelation || '',
          },
        },
        {
          arrayFilters: [{
            'p.id': b.personId,
            'p.surname': samePart(b.newSurname), 'p.givenName': samePart(b.newGivenName),
            'p.parentName': samePart(b.newParentName), 'p.parentRelation': samePart(b.newParentRelation),
          }],
        },
      );
      if (res && res.modifiedCount) { restored += res.modifiedCount; touched.add(b.community); }
      if (b.newNameOrder) {
        // eslint-disable-next-line no-await-in-loop
        const ord = await synagogues.updateOne(
          { slug: b.community, nameOrder: b.newNameOrder },
          { $set: { nameOrder: b.oldNameOrder || '' } },
        );
        if (ord && ord.modifiedCount) touched.add(b.community);
      }
      continue;
    }
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

/** Every rule the runner accepts (the master endpoint, CLI and the manual workflow use the same list). */
const RULES = ['ben-bat', 'patronymic', 'drop-patronymic-dup', 'nominative-parents', 'split-surname', 'split-parts', 'split-parts-2'];

/** Dispatch by mode: 'dry-run' | 'apply' | 'restore'. */
async function runNameNormalization(db, {
  mode = 'dry-run', runId = '', slug = '', inferGender = true, rule = 'ben-bat', genderFix = {}, approve = [],
} = {}) {
  if (!RULES.includes(rule)) throw new Error(`unknown rule: ${rule}`);
  const synagogues = db.collection('synagogues');
  const backups = db.collection(BACKUP_COLLECTION);
  if (mode === 'dry-run') return { mode, rule, ...(await planNormalization(synagogues, { slug, inferGender, rule, genderFix, approve })) };
  if (mode === 'apply') return { mode, rule, ...(await applyNormalization(synagogues, backups, { slug, inferGender, rule, genderFix, approve })) };
  if (mode === 'restore') return { mode, ...(await restoreNormalization(synagogues, backups, runId)) };
  throw new Error(`unknown mode: ${mode}`);
}

module.exports = {
  BACKUP_COLLECTION,
  RULES,
  planPerson,
  planGenderInference,
  planPatronymic,
  planDropPatronymicDup,
  planNominativeParents,
  planSplitSurnameNormalization,
  planSplitPartsNormalization,
  planSplitParts2Normalization,
  planNormalization,
  applyNormalization,
  restoreNormalization,
  runNameNormalization,
  newRunId,
};
