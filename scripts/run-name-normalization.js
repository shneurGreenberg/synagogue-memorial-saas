#!/usr/bin/env node
/**
 * 1.36.1 I64: run the сын/дочь → бен/бат normalisation against MONGODB_URI (used by the manual
 * "Name normalization" GitHub workflow, which can reach Atlas; the same logic is also exposed to the
 * master admin at POST /master/api/name-normalization).
 *
 *   MONGODB_URI=... node scripts/run-name-normalization.js --mode=dry-run|apply|restore [--run-id=…] [--slug=…]
 *     [--rule=ben-bat|patronymic|drop-patronymic-dup] [--encrypt-to=out.enc.json] [--gender-fix=slug:id=female,…]
 *
 * 1.37.0 I65: --rule=patronymic converts Russian patronymics (…Ефимовна → бат Ефим). With --encrypt-to and
 * RESULT_PUBKEY (base64 of an RSA public key PEM) the rows go only into a CSV encrypted for that key
 * (RSA-OAEP-SHA256 + AES-256-GCM) and the log shows counts only — no names in public CI logs.
 *
 * Prints counts and the list of proposed changes (names are the ones shown on the public boards).
 * Never prints the connection string.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const fs = require('fs');
const { runNameNormalization } = require('../lib/name-normalization-run');

const args = process.argv.slice(2);
const arg = (name) => { const a = args.find((x) => x.startsWith(`--${name}=`)); return a ? a.slice(name.length + 3) : ''; };
const mode = arg('mode') || 'dry-run';
const rule = arg('rule') || 'ben-bat';
const encryptTo = arg('encrypt-to');
// 1.36.4: approved gender corrections by record id only (no names on the command line / in logs).
const genderFix = {};
arg('gender-fix').split(',').map((x) => x.trim()).filter(Boolean).forEach((x) => {
  const m = /^([a-z0-9-]+):([^=]+)=(male|female)$/.exec(x);
  if (!m) throw new Error(`bad --gender-fix entry: ${x}`);
  genderFix[`${m[1]}:${m[2]}`] = m[3];
});

const csvCell = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
function rowsToCsv(rows) {
  const head = ['community', 'id', 'old_name', 'new_name', 'father_derived', 'patronymic', 'gender_old', 'gender_new',
    'confidence', 'status', 'note', 'proposed_name_if_approved', 'rule', 'kind'];
  const lines = rows.map((r) => [r.community, r.id, r.oldName, r.newName, r.father || '', r.patronymic || '',
    r.oldGender || '', r.newGender || '', r.confidence || '', (r.uncertain || r.ambiguous) ? 'skipped' : 'convert',
    r.note || '', r.proposedName || '', r.rule, r.kind].map(csvCell).join(','));
  return `\ufeff${head.join(',')}\n${lines.join('\n')}\n`;
}
function encryptFor(pubB64, text) {
  const pem = Buffer.from(pubB64, 'base64').toString('utf8');
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const wrapped = crypto.publicEncrypt({ key: pem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, key);
  return JSON.stringify({ v: 1, alg: 'RSA-OAEP-256+A256GCM', key: wrapped.toString('base64'), iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') });
}
const redact = (msg) => String(msg || '').replace(/mongodb(\+srv)?:\/\/\S+/g, '[uri]');

(async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  const result = await runNameNormalization(mongoose.connection.db, { mode, rule, genderFix, runId: arg('run-id'), slug: arg('slug') });
  const { rows, ...rest } = result;
  console.log(`MODE ${mode} RULE ${rule}`);
  console.log(JSON.stringify(rest, null, 2));
  if (encryptTo) {
    if (!process.env.RESULT_PUBKEY) throw new Error('RESULT_PUBKEY is not set');
    fs.writeFileSync(encryptTo, encryptFor(process.env.RESULT_PUBKEY, rowsToCsv(rows || [])));
    console.log(`wrote ${(rows || []).length} rows (encrypted) to ${encryptTo}`);
    await mongoose.disconnect();
    return;
  }
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
