#!/usr/bin/env node
/**
 * Download placeholder portraits for people (testing only).
 *
 * Usage:
 *   node scripts/seed-photos.js --slug=novosibirsk
 *   node scripts/seed-photos.js --slug=novosibirsk --source=generated
 *   node scripts/seed-photos.js --slug=novosibirsk --force --limit=20
 *
 * --source=random   randomuser.me (default, fast)
 * --source=generated   thispersondoesnotexist.com (slow, ~1.2s per face)
 * --source=dicebear    dicebear personas
 * --source=mixed       every 3rd generated, rest random
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { seedPhotosForSynagogue } = require('../lib/seed-people-photos');

function parseArgs() {
  const args = {
    slug: 'novosibirsk',
    source: 'random',
    force: false,
    limit: 0,
  };

  process.argv.slice(2).forEach((arg) => {
    if (arg.startsWith('--slug=')) {
      args.slug = arg.split('=')[1];
    } else if (arg.startsWith('--source=')) {
      args.source = arg.split('=')[1];
    } else if (arg === '--force') {
      args.force = true;
    } else if (arg.startsWith('--limit=')) {
      args.limit = parseInt(arg.split('=')[1], 10);
    }
  });

  return args;
}

async function main() {
  const { slug, source, force, limit } = parseArgs();
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/synagogue';

  mongoose.set('strictQuery', false);
  await mongoose.connect(uri);

  const result = await seedPhotosForSynagogue(slug, {
    source,
    force,
    limit: limit || 0,
  });

  console.log(`Done. Updated ${result.updated}, skipped ${result.skipped}, processed ${result.total}.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
