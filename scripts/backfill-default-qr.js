#!/usr/bin/env node
/**
 * Backfill auto-generated QR images for communities that have none set.
 * Dry-run by default; pass --apply to write to MongoDB and images/.
 * Do not run against production without review.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Synagogue = require('../models/Synagogue');
const {
  planDefaultCommunityQrBackfill,
  applyPlannedCommunityQrBackfill,
} = require('../lib/default-community-qr');

const apply = process.argv.includes('--apply');
const slugArg = process.argv.find((arg) => arg.startsWith('--slug='));
const slugFilter = slugArg ? slugArg.slice('--slug='.length).trim() : '';

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/synagogue';
  await mongoose.connect(uri);

  const query = slugFilter ? { slug: slugFilter } : {};
  const communities = await Synagogue.find(query)
    .select('slug name publicSubmission provisioning')
    .lean();
  let candidates = 0;
  let updated = 0;

  for (const row of communities) {
    const planned = planDefaultCommunityQrBackfill(row);
    if (!planned) {
      continue;
    }

    candidates += 1;
    const label = `${row.slug} (${row.name || ''})`;
    if (!apply) {
      for (const [field, value] of Object.entries(planned)) {
        console.log(`[dry-run] ${label}: would set publicSubmission.${field}=${value}`);
      }
      continue;
    }

    const doc = await Synagogue.findOne({ slug: row.slug });
    if (!doc) {
      continue;
    }
    await applyPlannedCommunityQrBackfill(row, doc, planned);
    await doc.save();
    updated += 1;
    console.log(`[apply] backfilled QR for ${label}`);
  }

  console.log(`Done. candidates=${candidates} updated=${updated} mode=${apply ? 'apply' : 'dry-run'}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
