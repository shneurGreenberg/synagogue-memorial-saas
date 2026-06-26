#!/usr/bin/env node
require('dotenv').config();

const mongoose = require('mongoose');
const Synagogue = require('../models/Synagogue');
const { repairSavedViewsInDb, savedViewsNeedRepair } = require('../lib/saved-views');

async function main() {
  const slug = process.argv[2] || '';
  await mongoose.connect(process.env.MONGODB_URI);

  const query = slug ? { slug } : {};
  const synagogues = await Synagogue.find(query, 'slug savedViews').lean();
  let repaired = 0;

  for (const synagogue of synagogues) {
    if (!savedViewsNeedRepair(synagogue.savedViews)) {
      continue;
    }

    const ok = await repairSavedViewsInDb(synagogue.slug);
    if (ok) {
      repaired += 1;
      console.log(`Repaired saved views for ${synagogue.slug}`);
    }
  }

  console.log(`Done. Repaired ${repaired} synagogue(s).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
