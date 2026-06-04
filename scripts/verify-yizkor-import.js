#!/usr/bin/env node
/**
 * Verify Yizkor import: names, photos (recursive search), optional MongoDB.
 *
 *   node scripts/verify-yizkor-import.js --source="C:\Users\user\Downloads\יזכור" --mongo
 *   node scripts/verify-yizkor-import.js --source="..." --photos-from="C:\old\photos" --scan
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Synagogue = require('../models/Synagogue');
const {
  indexImagesRecursive,
  mergeImageIndexes,
  lookupImage,
  countImageFiles,
  sampleIndexPaths,
} = require('../lib/yizkor-photos');

const PHOTOS_DIR = path.join(__dirname, '..', 'photos');
const REPO_DATABASE = path.join(__dirname, '..', 'database.json');

function parseArgs() {
  const args = { source: '', photosFrom: '', slug: 'novosibirsk', mongo: false, scan: false };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--source=')) args.source = arg.slice('--source='.length);
    else if (arg.startsWith('--photos-from=')) args.photosFrom = arg.slice('--photos-from='.length);
    else if (arg.startsWith('--slug=')) args.slug = arg.slice('--slug='.length);
    else if (arg === '--mongo') args.mongo = true;
    else if (arg === '--scan') args.scan = true;
  }
  return args;
}

function loadPeopleFromJson(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const data = raw.data || raw;
  return (data.people || []).map((p) => ({
    id: p.id,
    name: (p.name || '').trim(),
    photo: (p.photo || '').trim(),
  }));
}

function findDatabaseFile(sourceDir) {
  for (const name of ['database.json', 'data.json']) {
    const full = path.join(sourceDir, name);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

function buildSearchIndex(sourceDir, photosFrom) {
  const indexes = [indexImagesRecursive(sourceDir)];
  if (photosFrom && fs.existsSync(photosFrom)) {
    indexes.push(indexImagesRecursive(path.resolve(photosFrom)));
  }
  return mergeImageIndexes(...indexes);
}

function checkPhotoRefs(people, index) {
  const missing = [];
  let okCount = 0;
  const withPhoto = people.filter((p) => p.photo).length;
  for (const p of people) {
    if (!p.photo) continue;
    if (lookupImage(index, p.photo)) okCount += 1;
    else missing.push({ id: p.id, name: p.name, photo: p.photo });
  }
  return { missing, okCount, withPhoto };
}

function listProjectPhotos() {
  const names = new Set();
  if (!fs.existsSync(PHOTOS_DIR)) return names;
  for (const f of fs.readdirSync(PHOTOS_DIR)) {
    names.add(f);
    names.add(f.toLowerCase());
  }
  return names;
}

function checkProjectPhotos(people) {
  const onDisk = listProjectPhotos();
  const missing = [];
  let okCount = 0;
  const withPhoto = people.filter((p) => p.photo).length;
  for (const p of people) {
    if (!p.photo) continue;
    if (onDisk.has(p.photo) || onDisk.has(p.photo.toLowerCase())) okCount += 1;
    else missing.push({ id: p.id, name: p.name, photo: p.photo });
  }
  return { missing, okCount, withPhoto };
}

function diffPeople(listA, listB) {
  const mapA = new Map(listA.map((p) => [p.id, p]));
  const mapB = new Map(listB.map((p) => [p.id, p]));
  const onlyA = [];
  const onlyB = [];
  const sameIdDiffName = [];
  for (const [id, a] of mapA) {
    const b = mapB.get(id);
    if (!b) onlyA.push(a);
    else if (a.name !== b.name) sameIdDiffName.push({ id, from: a.name, to: b.name });
  }
  for (const [id, b] of mapB) {
    if (!mapA.has(id)) onlyB.push(b);
  }
  return { onlyA, onlyB, sameIdDiffName };
}

async function loadMongoPeople(slug) {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing — skip --mongo or fix .env');
  mongoose.set('strictQuery', false);
  await mongoose.connect(uri);
  const doc = await Synagogue.findOne({ slug }).lean();
  await mongoose.disconnect();
  if (!doc) throw new Error(`Synagogue "${slug}" not found in MongoDB`);
  return (doc.people || []).map((p) => ({
    id: p.id,
    name: (p.name || '').trim(),
    photo: (p.photo || '').trim(),
  }));
}

function printSection(title) {
  console.log('\n' + '='.repeat(60));
  console.log(title);
  console.log('='.repeat(60));
}

function printList(title, items, max = 25) {
  console.log(`\n${title}: ${items.length}`);
  items.slice(0, max).forEach((p) => {
    console.log(`  [${p.id}] ${p.name}${p.photo ? ` (${p.photo})` : ''}`);
  });
  if (items.length > max) console.log(`  ... and ${items.length - max} more`);
}

async function main() {
  const args = parseArgs();
  if (!args.source) {
    console.error(
      'Usage: node scripts/verify-yizkor-import.js --source="C:\\Users\\user\\Downloads\\יזכור" [--photos-from=...] [--mongo] [--scan]',
    );
    process.exit(1);
  }

  const sourceDir = path.resolve(args.source);
  if (!fs.existsSync(sourceDir)) {
    console.error(`Source not found: ${sourceDir}`);
    process.exit(1);
  }

  const sourceDbPath = findDatabaseFile(sourceDir);
  if (!sourceDbPath) {
    console.error(`No database.json in ${sourceDir}`);
    process.exit(1);
  }

  const sourcePeople = loadPeopleFromJson(sourceDbPath);
  const repoPeople = fs.existsSync(REPO_DATABASE) ? loadPeopleFromJson(REPO_DATABASE) : [];
  const searchIndex = buildSearchIndex(sourceDir, args.photosFrom);
  const totalImages = countImageFiles(searchIndex);

  printSection('סיכום / Summary');
  console.log(`Source folder:      ${sourceDir}`);
  if (args.photosFrom) console.log(`Extra photos path:  ${path.resolve(args.photosFrom)}`);
  console.log(`Source database:    ${sourcePeople.length} people`);
  console.log(`All image files (recursive search): ${totalImages}`);
  if (totalImages > 0) {
    console.log('Sample image locations:');
    sampleIndexPaths(searchIndex, 10).forEach((p) => console.log(`  - ${p}`));
  } else {
    console.log('WARNING: No images found under Yizkor folder (any subfolder).');
    console.log('Copy your photos into e.g. C:\\Users\\user\\Downloads\\יזכור\\photos\\');
  }

  const sourceRefs = checkPhotoRefs(sourcePeople, searchIndex);
  const projectRefs = checkProjectPhotos(sourcePeople);

  printSection('תמונות / Photos');
  console.log(
    `Referenced in database: ${sourceRefs.withPhoto} people with photo field`,
  );
  console.log(
    `Found on disk (search):  ${sourceRefs.okCount}/${sourceRefs.withPhoto}`,
  );
  console.log(
    `In project photos/:     ${projectRefs.okCount}/${projectRefs.withPhoto}`,
  );

  if (sourceRefs.okCount < sourceRefs.withPhoto && totalImages < 20) {
    console.log('\n>>> Most photos are NOT inside the Yizkor folder.');
    console.log('>>> Try import with the old project photos folder:');
    console.log('    --photos-from="C:\\Users\\user\\Downloads\\novosibirsk-synagogue\\photos"');
    console.log('    --photos-from="C:\\Users\\770ab\\Downloads\\novosibirsk-synagogue-master\\photos"');
  }

  if (projectRefs.missing.length) {
    printList('Missing in project photos/ (run import-yizkor)', projectRefs.missing);
  } else if (projectRefs.withPhoto > 0) {
    console.log('OK — all photos exist in project photos/.');
  }

  if (args.scan) {
    console.log('\n--scan done (image discovery only).');
    process.exit(sourceRefs.okCount >= sourceRefs.withPhoto ? 0 : 1);
  }

  const repoVsSource = diffPeople(repoPeople, sourcePeople);
  printSection('database.json בפרויקט');
  if (
    repoVsSource.onlyA.length === 0 &&
    repoVsSource.onlyB.length === 0 &&
    repoVsSource.sameIdDiffName.length === 0
  ) {
    console.log('OK — matches Yizkor folder.');
  } else {
    console.log('NOT OK — run import with --sync-json');
    printList('Only in project', repoVsSource.onlyA);
    printList('Only in Yizkor', repoVsSource.onlyB);
  }

  if (args.mongo) {
    try {
      const mongoPeople = await loadMongoPeople(args.slug);
      const mongoVsSource = diffPeople(mongoPeople, sourcePeople);
      printSection('MongoDB');
      console.log(`People: ${mongoPeople.length}`);
      if (
        mongoVsSource.onlyA.length === 0 &&
        mongoVsSource.onlyB.length === 0 &&
        mongoVsSource.sameIdDiffName.length === 0
      ) {
        console.log('OK — names/data match Yizkor.');
      } else {
        console.log('NOT OK — run import-yizkor --force');
      }
    } catch (e) {
      console.error('MongoDB:', e.message);
    }
  }

  printSection('Verdict');
  const repoOk =
    repoVsSource.onlyA.length === 0 &&
    repoVsSource.onlyB.length === 0 &&
    repoVsSource.sameIdDiffName.length === 0;
  const photosOk = projectRefs.missing.length === 0 && projectRefs.withPhoto > 0;

  if (photosOk && (repoPeople.length === 0 || repoOk)) {
    console.log('PASS — http://localhost:3000/s/novosibirsk');
    return;
  }

  console.log('FAIL — fix photos then run:');
  console.log('  node scripts/import-yizkor.js --source="..." --photos-from="C:\\path\\to\\photos" --force --sync-json');
  process.exit(1);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
