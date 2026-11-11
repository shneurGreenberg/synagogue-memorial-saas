#!/usr/bin/env node
/**
 * 1.36.0 I64: propose normalising сын/дочь (son of / daughter of …) inside deceased names to
 * бен/бат (Russian), בן/בת (Hebrew), ben/bat (Latin), and fill a missing gender where inferable.
 *
 * DRY RUN by default — reads only, writes a CSV report. Nothing is written to the database
 * unless --apply is given explicitly.
 *
 *   MONGODB_URI=... node scripts/normalize-ben-bat.js [--out=/path/report.csv] [--slug=novosibirsk] [--apply]
 *   node scripts/normalize-ben-bat.js --from-json=<dir of /s/<slug>/api/board JSON files>   (offline dry run;
 *     the public board data has no gender field, so gender_old is reported as "n/a")
 *
 * Never prints the connection string.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { proposeBenBat } = require('../lib/normalize-ben-bat');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const outArg = args.find((a) => a.startsWith('--out='));
const slugArg = args.find((a) => a.startsWith('--slug='));
const OUT = outArg ? outArg.slice(6) : path.join(process.cwd(), 'kaddish-ben-bat-dryrun.csv');
const ONLY_SLUG = slugArg ? slugArg.slice(7) : '';
const jsonArg = args.find((a) => a.startsWith('--from-json='));
const FROM_JSON = jsonArg ? jsonArg.slice(12) : '';

function loadJsonDocs(dir) {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => {
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    return {
      slug: data.slug || f.replace(/\.json$/, ''),
      people: (data.people || []).map((p) => ({ id: p.id, name: p.name, gender: p.gender, genderUnknown: !('gender' in p) })),
    };
  }).filter((d) => !ONLY_SLUG || d.slug === ONLY_SLUG);
}

function csvCell(v) {
  const s = String(v == null ? '' : v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function redact(msg) {
  return String(msg || '').replace(/mongodb(\+srv)?:\/\/\S+/g, '[uri]');
}

(async () => {
  let col = null;
  let docs;
  if (FROM_JSON) {
    if (APPLY) throw new Error('--apply needs the database, not --from-json');
    docs = loadJsonDocs(FROM_JSON);
  } else {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
    col = mongoose.connection.db.collection('synagogues');
    const filter = ONLY_SLUG ? { slug: ONLY_SLUG } : {};
    docs = await col.find(filter, { projection: { slug: 1, 'people.id': 1, 'people.name': 1, 'people.gender': 1 } }).toArray();
  }

  const rows = [];
  const counts = { communities: docs.length, people: 0, changes: 0, nameChanges: 0, genderChanges: 0, genderOnly: 0, ambiguous: 0, byRule: {}, byCommunity: {} };
  for (const doc of docs) {
    for (const person of doc.people || []) {
      counts.people += 1;
      const p = proposeBenBat(person);
      if (!p) continue;
      // Public board JSON has no gender: a gender-only proposal can't be checked against the record.
      if (person.genderUnknown && p.newName === p.name) { counts.genderOnlySkipped = (counts.genderOnlySkipped || 0) + 1; continue; }
      counts.changes += 1;
      if (p.newName !== p.name) counts.nameChanges += 1;
      if (p.newGender !== p.gender) counts.genderChanges += 1;
      if (p.newName === p.name) counts.genderOnly += 1;
      if (p.ambiguous) counts.ambiguous += 1;
      counts.byRule[p.rule] = (counts.byRule[p.rule] || 0) + 1;
      counts.byCommunity[doc.slug] = (counts.byCommunity[doc.slug] || 0) + 1;
      rows.push({ community: doc.slug, id: person.id, genderUnknown: person.genderUnknown, ...p });
    }
  }

  const header = ['community', 'id', 'old_name', 'new_name', 'gender_old', 'gender_new', 'rule', 'needs_review', 'note'];
  const lines = [header.join(',')].concat(rows.map((r) => [
    r.community, r.id, r.name, r.newName, r.genderUnknown ? 'n/a' : (r.gender || ''), r.newGender || '', r.rule, r.ambiguous ? 'yes' : '', r.note,
  ].map(csvCell).join(',')));
  fs.writeFileSync(OUT, `\uFEFF${lines.join('\n')}\n`, 'utf8');

  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'}${FROM_JSON ? ' (from public board JSON)' : ''} — report: ${OUT}`);
  console.log(JSON.stringify(counts, null, 2));

  if (APPLY) {
    let updated = 0;
    for (const r of rows) {
      if (r.ambiguous) continue; // never auto-apply rows that need a human look
      const set = {};
      if (r.newName !== r.name) set['people.$[p].name'] = r.newName;
      if (r.newGender !== r.gender) set['people.$[p].gender'] = r.newGender;
      if (!Object.keys(set).length) continue;
      // eslint-disable-next-line no-await-in-loop
      const res = await col.updateOne(
        { slug: r.community },
        { $set: set },
        { arrayFilters: [{ 'p.id': r.id, 'p.name': r.name }] },
      );
      updated += res.modifiedCount || 0;
    }
    console.log(`applied: ${updated} records (ambiguous rows skipped)`);
  }
  if (col) await mongoose.disconnect();
})().catch((e) => {
  console.error('normalize-ben-bat failed:', redact(e && e.message));
  process.exit(1);
});
