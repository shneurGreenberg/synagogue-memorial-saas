#!/usr/bin/env node
/**
 * List possible image files for memorial entries still missing after import.
 *
 *   node scripts/suggest-missing-photos.js --source="C:\Users\user\Downloads\יזכור"
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  indexImagesRecursive,
  uniqueEntries,
  suggestCandidates,
  parsePhotoReference,
} = require('../lib/yizkor-photos');

const PHOTOS_DIR = path.join(__dirname, '..', 'photos');

function parseArgs() {
  let source = '';
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--source=')) source = arg.slice('--source='.length);
  }
  return { source };
}

function findDatabase(sourceDir) {
  for (const name of ['database.json', 'data.json']) {
    const p = path.join(sourceDir, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function main() {
  const { source } = parseArgs();
  if (!source) {
    console.error('Usage: node scripts/suggest-missing-photos.js --source="..."');
    process.exit(1);
  }

  const sourceDir = path.resolve(source);
  const dbPath = findDatabase(sourceDir);
  if (!dbPath) {
    console.error('No database.json in source folder');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(dbPath, 'utf8')).data || JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const people = data.people || [];
  const index = indexImagesRecursive(sourceDir);
  const entries = uniqueEntries(index);

  const missing = people.filter((p) => {
    const photo = p.photo && String(p.photo).trim();
    if (!photo) return false;
    const dest = path.join(PHOTOS_DIR, photo);
    return !fs.existsSync(dest);
  });

  console.log(`Missing ${missing.length} photos in ${PHOTOS_DIR}\n`);

  for (const person of missing) {
    const photo = String(person.photo).trim();
    const parsed = parsePhotoReference(photo);
    console.log(`[${person.id}] ${person.name}`);
    console.log(`  expects: ${photo} (memorial #${parsed.id})`);

    const ideas = suggestCandidates(entries, photo, person.id, person.name, 6);
    if (ideas.length) {
      console.log('  possible files in Yizkor folder:');
      ideas.forEach((e) => console.log(`    - ${e.relativePath || e.name}`));
    } else {
      console.log('  no similar file found — add a photo with № or rename manually');
    }
    console.log('');
  }
}

main();
