#!/usr/bin/env node
/**
 * Verify that memorial data from the Yizkor folder was imported correctly:
 * names replaced, photos on disk, optional MongoDB match.
 *
 * Usage (Windows):
 *   node scripts/verify-yizkor-import.js --source="C:\Users\user\Downloads\יזכור"
 *   node scripts/verify-yizkor-import.js --source="..." --mongo
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Synagogue = require('../models/Synagogue');

const PHOTOS_DIR = path.join(__dirname, '..', 'photos');
const REPO_DATABASE = path.join(__dirname, '..', 'database.json');
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

function parseArgs() {
  const args = { source: '', slug: 'novosibirsk', mongo: false };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--source=')) args.source = arg.slice('--source='.length);
    else if (arg.startsWith('--slug=')) args.slug = arg.slice('--slug='.length);
    else if (arg === '--mongo') args.mongo = true;
  }
  return args;
}

function personKey(p) {
  return `${p.id}|${(p.name || '').trim()}`;
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

function listPhotosOnDisk(dir) {
  if (!fs.existsSync(dir)) return new Set();
  const names = new Set();
  for (const f of fs.readdirSync(dir)) {
    if (IMAGE_EXT.has(path.extname(f).toLowerCase())) names.add(f);
  }
  return names;
}

function collectSourceImages(sourceDir) {
  const dirs = [sourceDir];
  for (const sub of ['photos', 'images', 'Images']) {
    const d = path.join(sourceDir, sub);
    if (fs.existsSync(d) && fs.statSync(d).isDirectory()) dirs.push(d);
  }
  const all = new Set();
  for (const d of dirs) {
    for (const n of listPhotosOnDisk(d)) all.add(n);
  }
  return all;
}

function diffPeople(labelA, listA, labelB, listB) {
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

function checkPhotoRefs(label, people, diskPhotos) {
  const missing = [];
  const ok = [];
  for (const p of people) {
    if (!p.photo) continue;
    if (diskPhotos.has(p.photo)) ok.push(p);
    else missing.push({ id: p.id, name: p.name, photo: p.photo });
  }
  return { missing, okCount: ok.length, withPhoto: people.filter((p) => p.photo).length };
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
    console.error('Usage: node scripts/verify-yizkor-import.js --source="C:\\Users\\user\\Downloads\\יזכור" [--mongo]');
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
  const repoPeople = fs.existsSync(REPO_DATABASE)
    ? loadPeopleFromJson(REPO_DATABASE)
    : [];
  const projectPhotos = listPhotosOnDisk(PHOTOS_DIR);
  const sourceImages = collectSourceImages(sourceDir);

  printSection('סיכום / Summary');
  console.log(`Source folder:     ${sourceDir}`);
  console.log(`Source database:   ${sourceDbPath} → ${sourcePeople.length} people`);
  console.log(`Repo database.json: ${repoPeople.length} people`);
  console.log(`Source image files: ${sourceImages.size}`);
  console.log(`Project photos/:    ${projectPhotos.size} files`);

  const repoVsSource = diffPeople('repo', repoPeople, 'source', sourcePeople);
  printSection('האם database.json בפרויקט = התיקייה שלך?');
  if (
    repoVsSource.onlyA.length === 0 &&
    repoVsSource.onlyB.length === 0 &&
    repoVsSource.sameIdDiffName.length === 0
  ) {
    console.log('OK — repo database.json matches your Yizkor folder (names & ids).');
  } else {
    console.log('NOT OK — project database.json still differs from Yizkor folder.');
    printList('Names only in PROJECT (old — should be removed after import --sync-json)', repoVsSource.onlyA);
    printList('Names only in YIZKOR folder (missing from project)', repoVsSource.onlyB);
    if (repoVsSource.sameIdDiffName.length) {
      console.log('\nSame id, different name:');
      repoVsSource.sameIdDiffName.slice(0, 15).forEach((x) => {
        console.log(`  id ${x.id}: project "${x.from}" → yizkor "${x.to}"`);
      });
    }
  }

  const photosInRepo = checkPhotoRefs('photos/', repoPeople, projectPhotos);
  const photosSourceRefs = checkPhotoRefs('source refs', sourcePeople, sourceImages);
  const photosCopied = checkPhotoRefs('copied to photos/', sourcePeople, projectPhotos);

  printSection('תמונות / Photos');
  console.log(
    `Yizkor folder: ${photosSourceRefs.okCount}/${photosSourceRefs.withPhoto} referenced files found`,
  );
  console.log(
    `Project photos/: ${photosCopied.okCount}/${photosCopied.withPhoto} referenced files on disk`,
  );
  if (photosCopied.missing.length) {
    printList('Missing in photos/ (run import-yizkor again)', photosCopied.missing);
  } else if (photosCopied.withPhoto > 0) {
    console.log('OK — all photo filenames from Yizkor exist in project photos/.');
  }

  if (args.mongo) {
    let mongoPeople;
    try {
      mongoPeople = await loadMongoPeople(args.slug);
    } catch (e) {
      console.error('\nMongoDB check failed:', e.message);
      process.exit(1);
    }
    const mongoVsSource = diffPeople('mongo', mongoPeople, 'source', sourcePeople);
    printSection('MongoDB (what the live site uses)');
    console.log(`MongoDB people count: ${mongoPeople.length}`);
    if (
      mongoVsSource.onlyA.length === 0 &&
      mongoVsSource.onlyB.length === 0 &&
      mongoVsSource.sameIdDiffName.length === 0
    ) {
      console.log('OK — MongoDB matches your Yizkor folder.');
    } else {
      console.log('NOT OK — run: node scripts/import-yizkor.js --source="..." --force');
      printList('Only in MongoDB (old entries)', mongoVsSource.onlyA);
      printList('Only in Yizkor (not imported to MongoDB)', mongoVsSource.onlyB);
    }
  } else {
    console.log('\nTip: add --mongo to also verify MongoDB (the running website data).');
  }

  printSection('Verdict');
  const repoOk =
    repoVsSource.onlyA.length === 0 &&
    repoVsSource.onlyB.length === 0 &&
    repoVsSource.sameIdDiffName.length === 0;
  const photosOk = photosCopied.missing.length === 0;

  if (repoOk && photosOk) {
    console.log('PASS — local project files look correct. Open http://localhost:3000/s/novosibirsk');
  } else {
    console.log('FAIL — re-run import:');
    console.log(
      '  node scripts/import-yizkor.js --source="C:\\Users\\user\\Downloads\\יזכור" --force --sync-json',
    );
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
