#!/usr/bin/env node
/* Usage: MONGODB_URI=... node scripts/migrate-deceased-gender.js [--dry-run] */
require('dotenv').config();
const mongoose = require('mongoose');
const Synagogue = require('../models/Synagogue');
const { migrateDeceasedGender } = require('../lib/migrate-deceased-gender');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/synagogue');
  const report = await migrateDeceasedGender(Synagogue, { dryRun: process.argv.includes('--dry-run') });
  report.forEach((r) => console.log(`${r.slug}: male=${r.male} female=${r.female} missing=${r.missing} (updated ${r.updated})`));
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
