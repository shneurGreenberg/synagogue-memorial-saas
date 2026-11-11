#!/usr/bin/env node
/**
 * 1.36.1 I64: run the сын/дочь → бен/бат normalisation against MONGODB_URI (used by the manual
 * "Name normalization" GitHub workflow, which can reach Atlas; the same logic is also exposed to the
 * master admin at POST /master/api/name-normalization).
 *
 *   MONGODB_URI=... node scripts/run-name-normalization.js --mode=dry-run|apply|restore [--run-id=…] [--slug=…]
 *
 * Prints counts and the list of proposed changes (names are the ones shown on the public boards).
 * Never prints the connection string.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { runNameNormalization } = require('../lib/name-normalization-run');

const args = process.argv.slice(2);
const arg = (name) => { const a = args.find((x) => x.startsWith(`--${name}=`)); return a ? a.slice(name.length + 3) : ''; };
const mode = arg('mode') || 'dry-run';
const redact = (msg) => String(msg || '').replace(/mongodb(\+srv)?:\/\/\S+/g, '[uri]');

(async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  const result = await runNameNormalization(mongoose.connection.db, { mode, runId: arg('run-id'), slug: arg('slug') });
  const { rows, ...rest } = result;
  console.log(`MODE ${mode}`);
  console.log(JSON.stringify(rest, null, 2));
  (rows || []).forEach((r) => {
    const status = r.ambiguous ? `SKIP(${r.note})` : (r.uncertain ? `UNCERTAIN(${r.note})` : (r.kind === 'gender' ? `ok(${r.note})` : 'ok'));
    console.log([r.kind === 'gender' ? 'GENDER' : 'ROW', r.community, r.id, r.rule, status,
      `gender ${r.oldGender || '-'}→${r.newGender || '-'}`, `${r.oldName} => ${r.newName}`].join(' | '));
  });
  await mongoose.disconnect();
})().catch((e) => {
  console.error('run-name-normalization failed:', redact(e && e.message));
  process.exit(1);
});
