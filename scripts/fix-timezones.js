#!/usr/bin/env node
/** Fix invalid IANA timezones on all synagogues (e.g. "tomsk" -> "Asia/Tomsk"). */
require('dotenv').config();
const mongoose = require('mongoose');
const Synagogue = require('../models/Synagogue');
const { resolveTimezone, isValidIanaTimezone } = require('../lib/normalize-timezone');

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/synagogue';
  mongoose.set('strictQuery', false);
  await mongoose.connect(uri);

  const synagogues = await Synagogue.find({});
  let fixed = 0;

  for (const synagogue of synagogues) {
    const loc = synagogue.location || {};
    const current = loc.timezone;
    const resolved = resolveTimezone(current, loc.lat, loc.long);

    if (current !== resolved || !isValidIanaTimezone(current)) {
      synagogue.location = { ...loc.toObject?.() || loc, timezone: resolved };
      await synagogue.save();
      console.log(`${synagogue.slug}: ${current} -> ${resolved}`);
      fixed += 1;
    }
  }

  console.log(`Fixed ${fixed} synagogue(s).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
