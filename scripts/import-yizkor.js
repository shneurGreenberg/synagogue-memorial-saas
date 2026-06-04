#!/usr/bin/env node
/**
 * Import memorial data and photos from a local "יזכור" / yizkor folder.
 *
 * Photos are searched recursively (all subfolders). Optional second folder:
 *   --photos-from="C:\path\to\old\photos"
 *
 * Usage (Windows):
 *   node scripts/import-yizkor.js --source="C:\Users\user\Downloads\יזכור" --force --sync-json
 *   node scripts/import-yizkor.js --source="..." --photos-from="C:\...\photos" --force
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Synagogue = require('../models/Synagogue');
const {
  indexImagesRecursive,
  mergeImageIndexes,
  copyReferencedPhotos,
  countImageFiles,
  sampleIndexPaths,
} = require('../lib/yizkor-photos');

const PHOTOS_DIR = path.join(__dirname, '..', 'photos');
const REPO_DATABASE = path.join(__dirname, '..', 'database.json');

function parseArgs() {
  const args = {
    source: '',
    photosFrom: '',
    slug: 'novosibirsk',
    syncJson: false,
    skipDb: false,
    force: false,
    allImages: false,
  };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--source=')) args.source = arg.slice('--source='.length);
    else if (arg.startsWith('--photos-from=')) args.photosFrom = arg.slice('--photos-from='.length);
    else if (arg.startsWith('--slug=')) args.slug = arg.slice('--slug='.length);
    else if (arg === '--sync-json') args.syncJson = true;
    else if (arg === '--skip-db') args.skipDb = true;
    else if (arg === '--force') args.force = true;
    else if (arg === '--all-images') args.allImages = true;
  }
  return args;
}

function resolveDir(raw, label) {
  if (!raw) return null;
  const resolved = path.resolve(raw);
  if (!fs.existsSync(resolved)) {
    throw new Error(`${label} not found: ${resolved}`);
  }
  return resolved;
}

function findDatabaseFile(sourceDir) {
  const candidates = ['database.json', 'data.json', 'db.json'];
  for (const name of candidates) {
    const full = path.join(sourceDir, name);
    if (fs.existsSync(full)) return full;
  }
  throw new Error(
    `No database.json in ${sourceDir}. Copy your memorial config file there and retry.`,
  );
}

function loadDatabase(dbPath) {
  const raw = fs.readFileSync(dbPath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON in ${dbPath}: ${e.message}`);
  }
  const data = parsed.data || parsed;
  if (!data || !Array.isArray(data.people)) {
    throw new Error(`${dbPath} must contain data.people (array of memorial entries)`);
  }
  return data;
}

function normalizePeople(people) {
  return people.map((person) => ({
    id: person.id,
    name: person.name,
    gregorianDateOfDeath: person.gregorianDateOfDeath,
    photo: person.photo || '',
    title: person.title || '',
    text: person.text || '',
  }));
}

async function updateMongo(slug, data, force) {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set in .env');
  }
  mongoose.set('strictQuery', false);
  await mongoose.connect(uri);

  const synagogue = await Synagogue.findOne({ slug });
  if (!synagogue) {
    throw new Error(`Synagogue "${slug}" not found. Run: node scripts/seed.js`);
  }

  if (synagogue.people?.length > 0 && !force) {
    console.log(
      `MongoDB already has ${synagogue.people.length} people for ${slug}. Use --force to replace.`,
    );
    await mongoose.disconnect();
    return false;
  }

  synagogue.people = normalizePeople(data.people);
  synagogue.dailyCites = data.dailyCites || synagogue.dailyCites || [];
  if (data.title) {
    synagogue.title = data.title;
    synagogue.titles = synagogue.titles || {};
    if (!synagogue.titles.ru) synagogue.titles.ru = data.title;
  }
  if (typeof data.weeklyChapterEnabled === 'boolean') {
    synagogue.weeklyChapterEnabled = data.weeklyChapterEnabled;
  }

  await synagogue.save();
  console.log(`MongoDB: saved ${synagogue.people.length} people for /s/${slug}`);
  await mongoose.disconnect();
  return true;
}

async function main() {
  const args = parseArgs();
  const sourceDir = resolveDir(args.source, 'Source folder');
  if (!sourceDir) {
    throw new Error('Missing --source=PATH');
  }

  const dbPath = findDatabaseFile(sourceDir);
  const data = loadDatabase(dbPath);
  const photoNames = data.people
    .map((p) => (p.photo && String(p.photo).trim()) || '')
    .filter(Boolean);

  const indexes = [indexImagesRecursive(sourceDir)];
  if (args.photosFrom) {
    indexes.push(indexImagesRecursive(resolveDir(args.photosFrom, 'Photos folder')));
  }
  const projectPhotos = path.join(__dirname, '..', 'photos');
  if (fs.existsSync(projectPhotos)) {
    indexes.push(indexImagesRecursive(projectPhotos));
  }
  const imageIndex = mergeImageIndexes(...indexes);

  const totalOnDisk = countImageFiles(imageIndex);
  console.log(`Source: ${sourceDir}`);
  if (args.photosFrom) console.log(`Extra photos: ${path.resolve(args.photosFrom)}`);
  console.log(`Database: ${dbPath} (${data.people.length} people, ${photoNames.length} photo refs)`);
  console.log(`Image files indexed (recursive): ${totalOnDisk}`);
  if (totalOnDisk > 0) {
    console.log('Sample paths:');
    sampleIndexPaths(imageIndex, 8).forEach((p) => console.log(`  - ${p}`));
  }

  let copied = 0;
  let missing = [];

  if (args.allImages) {
    const allNames = [...new Set([...imageIndex.values()].map((e) => e.name))];
    const result = copyReferencedPhotos(imageIndex, allNames, PHOTOS_DIR);
    copied = result.copied;
    missing = result.missing;
    console.log(`Copied ALL indexed images: ${copied}`);
  } else {
    const result = copyReferencedPhotos(imageIndex, photoNames, PHOTOS_DIR);
    copied = result.copied;
    missing = result.missing;
    console.log(`Copied ${copied}/${photoNames.length} referenced photos → ${PHOTOS_DIR}`);
  }

  if (missing.length) {
    console.warn(`\nStill missing ${missing.length} files (not found under source or --photos-from):`);
    console.warn(missing.slice(0, 12).join(', ') + (missing.length > 12 ? '...' : ''));
    console.warn('\nPut image files inside the Yizkor folder (any subfolder), e.g.:');
    console.warn('  C:\\Users\\user\\Downloads\\יזכור\\photos\\148.jpg');
    console.warn('Or point to an existing photos folder:');
    console.warn('  --photos-from="C:\\Users\\user\\synagogue-memorial-saas\\photos"');
    console.warn('  --photos-from="C:\\path\\to\\old-project\\photos"');
  }

  if (args.syncJson) {
    fs.copyFileSync(dbPath, REPO_DATABASE);
    console.log(`Updated repo ${REPO_DATABASE}`);
  }

  if (!args.skipDb) {
    await updateMongo(args.slug, data, args.force);
  } else {
    console.log('Skipped MongoDB (--skip-db).');
  }

  console.log('\nVerify: node scripts/verify-yizkor-import.js --source="..." --mongo');
  console.log('Then: npm run build:board && node app.js');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
