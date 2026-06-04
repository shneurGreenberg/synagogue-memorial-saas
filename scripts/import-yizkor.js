#!/usr/bin/env node
/**
 * Import memorial data and photos from a local "יזכור" / yizkor folder.
 *
 * Expected layout (any of these work):
 *   <folder>/database.json
 *   <folder>/photos/*.jpg
 *   — or photos next to database.json
 *
 * Usage (Windows, from project root):
 *   node scripts/import-yizkor.js --source="C:\Users\user\Downloads\יזכור"
 *
 * Options:
 *   --source=PATH     Required. Folder with database.json and images
 *   --slug=novosibirsk   Synagogue slug (default: novosibirsk)
 *   --sync-json       Also copy database.json into the repo root
 *   --skip-db         Only copy photos; do not update MongoDB
 *   --force           Overwrite existing people in MongoDB
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Synagogue = require('../models/Synagogue');

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const PHOTOS_DIR = path.join(__dirname, '..', 'photos');
const REPO_DATABASE = path.join(__dirname, '..', 'database.json');

function parseArgs() {
  const args = {
    source: '',
    slug: 'novosibirsk',
    syncJson: false,
    skipDb: false,
    force: false,
  };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--source=')) args.source = arg.slice('--source='.length);
    else if (arg.startsWith('--slug=')) args.slug = arg.slice('--slug='.length);
    else if (arg === '--sync-json') args.syncJson = true;
    else if (arg === '--skip-db') args.skipDb = true;
    else if (arg === '--force') args.force = true;
  }
  return args;
}

function resolveSourceDir(raw) {
  if (!raw) {
    throw new Error('Missing --source=PATH (e.g. --source="C:\\Users\\user\\Downloads\\יזכור")');
  }
  const resolved = path.resolve(raw);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Source folder not found: ${resolved}`);
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

function collectPhotoDirs(sourceDir) {
  const dirs = [sourceDir];
  for (const sub of ['photos', 'Images', 'images', 'תמונות']) {
    const full = path.join(sourceDir, sub);
    if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
      dirs.push(full);
    }
  }
  return dirs;
}

function listImageFiles(dirs) {
  const files = new Map();
  for (const dir of dirs) {
    for (const name of fs.readdirSync(dir)) {
      const ext = path.extname(name).toLowerCase();
      if (!IMAGE_EXT.has(ext)) continue;
      const full = path.join(dir, name);
      if (!fs.statSync(full).isFile()) continue;
      files.set(name, full);
    }
  }
  return files;
}

function copyPhotos(imageFiles) {
  if (!fs.existsSync(PHOTOS_DIR)) {
    fs.mkdirSync(PHOTOS_DIR, { recursive: true });
  }
  let copied = 0;
  for (const [name, src] of imageFiles) {
    const dest = path.join(PHOTOS_DIR, name);
    fs.copyFileSync(src, dest);
    copied += 1;
  }
  return copied;
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
    throw new Error(
      `Synagogue "${slug}" not found. Run: node scripts/seed.js`,
    );
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
  console.log(
    `MongoDB: saved ${synagogue.people.length} people for /s/${slug}`,
  );
  await mongoose.disconnect();
  return true;
}

async function main() {
  const args = parseArgs();
  const sourceDir = resolveSourceDir(args.source);
  const dbPath = findDatabaseFile(sourceDir);
  const data = loadDatabase(dbPath);
  const imageFiles = listImageFiles(collectPhotoDirs(sourceDir));

  console.log(`Source: ${sourceDir}`);
  console.log(`Database: ${dbPath} (${data.people.length} people)`);
  console.log(`Images found: ${imageFiles.size}`);

  const copied = copyPhotos(imageFiles);
  console.log(`Copied ${copied} files → ${PHOTOS_DIR}`);

  const referenced = data.people
    .map((p) => p.photo)
    .filter((name) => name && String(name).trim());
  const missing = referenced.filter((name) => !imageFiles.has(name));
  if (missing.length) {
    console.warn(
      `Warning: ${missing.length} photo filenames in database.json were not found in the source folder.`,
    );
    console.warn(`First missing: ${missing.slice(0, 8).join(', ')}`);
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

  console.log('\nNext: npm run build:board && node app.js');
  console.log(`Board: http://localhost:3000/s/${args.slug}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
