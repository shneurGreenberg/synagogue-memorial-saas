#!/usr/bin/env node
/**
 * Normalize people ↔ photo links in MongoDB and database.json.
 *
 *   node scripts/fix-people-photo-data.js
 *   node scripts/fix-people-photo-data.js --dry-run
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Synagogue = require('../models/Synagogue');
const { DEFAULT_PHOTO_CROP } = require('../lib/photo-crop');
const {
  indexImagesRecursive,
  resolveImageForReference,
} = require('../lib/yizkor-photos');

const SLUG = 'novosibirsk';
const PHOTOS_DIR = path.join(__dirname, '..', 'photos');
const DATABASE_PATH = path.join(__dirname, '..', 'database.json');
const REMOVE_IDS = new Set([103, 189]);
const dryRun = process.argv.includes('--dry-run');

function uniqueEntries(index) {
  const seen = new Set();
  const list = [];
  for (const entry of index.values()) {
    if (seen.has(entry.fullPath)) continue;
    seen.add(entry.fullPath);
    list.push(entry);
  }
  return list;
}

function standardPhotoName(personId) {
  return `${personId}.jpg`;
}

function copyPhotoFile(sourceName, destName) {
  const sourcePath = path.join(PHOTOS_DIR, sourceName);
  const destPath = path.join(PHOTOS_DIR, destName);
  if (!fs.existsSync(sourcePath)) {
    return false;
  }
  if (sourcePath === destPath) {
    return true;
  }
  if (!dryRun) {
    fs.copyFileSync(sourcePath, destPath);
  }
  return true;
}

function resolvePhotoFile(person, index, entries) {
  const current = person.photo && String(person.photo).trim();
  if (current) {
    const onDisk = path.join(PHOTOS_DIR, current);
    if (fs.existsSync(onDisk)) {
      return { filename: current, source: 'existing' };
    }

    const resolved = resolveImageForReference(index, entries, current, person.id, person.name);
    if (resolved && fs.existsSync(resolved.entry.fullPath)) {
      return { filename: path.basename(resolved.entry.fullPath), source: resolved.match };
    }
  }

  const target = standardPhotoName(person.id);
  const targetPath = path.join(PHOTOS_DIR, target);
  if (fs.existsSync(targetPath)) {
    return { filename: target, source: 'id-filename' };
  }

  const byId = resolveImageForReference(index, entries, target, person.id, person.name);
  if (byId && fs.existsSync(byId.entry.fullPath)) {
    return { filename: path.basename(byId.entry.fullPath), source: byId.match };
  }

  return null;
}

function personToJson(person) {
  const row = {
    id: person.id,
    name: person.name,
    gregorianDateOfDeath: person.gregorianDateOfDeath,
    photo: person.photo || '',
    title: person.title || '',
    text: person.text || '',
  };
  if (person.photo && person.photoCrop) {
    row.photoCrop = {
      x: person.photoCrop.x,
      y: person.photoCrop.y,
      zoom: person.photoCrop.zoom,
    };
  }
  return row;
}

function syncDatabaseJson(synagogue) {
  const raw = JSON.parse(fs.readFileSync(DATABASE_PATH, 'utf8'));
  const data = raw.data || raw;
  data.people = synagogue.people
    .map((p) => personToJson(p.toObject ? p.toObject() : p))
    .sort((a, b) => a.id - b.id);
  if (!dryRun) {
    fs.writeFileSync(DATABASE_PATH, `${JSON.stringify(raw, null, 2)}\n`, 'utf8');
  }
}

async function main() {
  mongoose.set('strictQuery', false);
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/synagogue');

  const synagogue = await Synagogue.findOne({ slug: SLUG });
  if (!synagogue) {
    throw new Error(`Synagogue "${SLUG}" not found`);
  }

  const photoIndex = indexImagesRecursive(PHOTOS_DIR);
  const photoEntries = uniqueEntries(photoIndex);
  const log = [];

  const beforeCount = synagogue.people.length;
  synagogue.people = synagogue.people.filter((person) => {
    if (REMOVE_IDS.has(person.id)) {
      log.push(`removed person id=${person.id} (${person.name})`);
      return false;
    }
    return true;
  });
  log.push(`people count ${beforeCount} -> ${synagogue.people.length}`);

  for (const person of synagogue.people) {
    if (!person.photo) {
      person.photo = '';
      person.photoCrop = undefined;
      continue;
    }

    const resolved = resolvePhotoFile(person, photoIndex, photoEntries);
    if (!resolved) {
      log.push(`cleared missing photo for id=${person.id} (${person.name}), was "${person.photo}"`);
      person.photo = '';
      person.photoCrop = undefined;
      continue;
    }

    const standardName = standardPhotoName(person.id);
    if (resolved.filename !== standardName) {
      const copied = copyPhotoFile(resolved.filename, standardName);
      if (!copied) {
        log.push(`failed to copy ${resolved.filename} -> ${standardName} for id=${person.id}`);
        person.photo = '';
        person.photoCrop = undefined;
        continue;
      }
      log.push(`id=${person.id}: ${person.photo} -> ${standardName} (via ${resolved.source})`);
    } else if (person.photo !== standardName) {
      log.push(`id=${person.id}: photo field ${person.photo} -> ${standardName}`);
    }

    person.photo = standardName;
    person.photoCrop = {
      x: person.photoCrop?.x ?? DEFAULT_PHOTO_CROP.x,
      y: person.photoCrop?.y ?? DEFAULT_PHOTO_CROP.y,
      zoom: person.photoCrop?.zoom ?? DEFAULT_PHOTO_CROP.zoom,
    };
  }

  if (!dryRun) {
    await synagogue.save();
    syncDatabaseJson(synagogue);
  }

  console.log(dryRun ? 'DRY RUN — no writes' : 'Applied fixes:');
  log.forEach((line) => console.log(`  ${line}`));

  const people = synagogue.people;
  const withPhoto = people.filter((p) => p.photo);
  const mismatched = withPhoto.filter((p) => p.photo !== standardPhotoName(p.id));
  const missingFiles = withPhoto.filter((p) => !fs.existsSync(path.join(PHOTOS_DIR, p.photo)));
  const dupPhotos = {};
  withPhoto.forEach((p) => {
    dupPhotos[p.photo] = (dupPhotos[p.photo] || []).concat(p.id);
  });
  const dupes = Object.entries(dupPhotos).filter(([, ids]) => ids.length > 1);

  console.log('\nVerification:');
  console.log(`  people: ${people.length}`);
  console.log(`  with photo: ${withPhoto.length}`);
  console.log(`  non-standard photo names: ${mismatched.length}`);
  console.log(`  missing files on disk: ${missingFiles.length}`);
  console.log(`  duplicate photo refs: ${dupes.length}`);
  if (missingFiles.length) {
    missingFiles.forEach((p) => console.log(`    id=${p.id} ${p.photo}`));
  }
  if (dupes.length) {
    dupes.forEach(([photo, ids]) => console.log(`    ${photo} -> ${ids.join(', ')}`));
  }

  await mongoose.disconnect();
  if (mismatched.length || missingFiles.length || dupes.length) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
