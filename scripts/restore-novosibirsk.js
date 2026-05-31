#!/usr/bin/env node
/**
 * Restore memorial people and daily cites for novosibirsk from database.json.
 * Preserves current synagogue settings (location, language, theme, etc.).
 *
 * Usage:
 *   node scripts/restore-novosibirsk.js
 *   node scripts/restore-novosibirsk.js --force
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Synagogue = require('../models/Synagogue');
const database = require('../database.json');
const { resolveTimezone } = require('../lib/normalize-timezone');

const SLUG = 'novosibirsk';
const force = process.argv.includes('--force');

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/synagogue';
  mongoose.set('strictQuery', false);
  await mongoose.connect(uri);

  const existing = await Synagogue.findOne({ slug: SLUG });
  if (!existing) {
    throw new Error(`Synagogue "${SLUG}" not found`);
  }

  if (existing.people && existing.people.length > 0 && !force) {
    console.log(`Already has ${existing.people.length} people. Use --force to overwrite.`);
    await mongoose.disconnect();
    return;
  }

  const people = (database.data.people || []).map((person) => ({
    id: person.id,
    name: person.name,
    gregorianDateOfDeath: person.gregorianDateOfDeath,
    photo: person.photo || '',
    title: person.title || '',
    text: person.text || '',
  }));

  const dailyCites = database.data.dailyCites || [];
  const location = existing.location || {};

  existing.people = people;
  existing.dailyCites = dailyCites;
  if (!existing.title || existing.title === 'Novosibirsk Synagogue') {
    existing.title = database.data.title || existing.title;
  }
  if (existing.titles && !existing.titles.ru) {
    existing.titles.ru = database.data.title || existing.title;
  }
  existing.weeklyChapterEnabled = database.data.weeklyChapterEnabled ?? existing.weeklyChapterEnabled;
  existing.location = {
    ...location,
    timezone: resolveTimezone(location.timezone, location.lat, location.long),
  };

  await existing.save();
  console.log(`Restored ${people.length} people and ${dailyCites.length} daily cites for ${SLUG}.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
