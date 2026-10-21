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
  applyDefaultCommunityQrToDocument,
  communityHasAnyQrSet,
} = require('../lib/default-community-qr');

const apply = process.argv.includes('--apply');

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/synagogue';
  await mongoose.connect(uri);

  const communities = await Synagogue.find({}).select('slug name publicSubmission provisioning').lean();
  let candidates = 0;
  let updated = 0;

  for (const row of communities) {
    const publicSubmission = row.publicSubmission || {};
    const provisioningQr = row.provisioning?.donationQrImage ? String(row.provisioning.donationQrImage).trim() : '';
    const hasQr = communityHasAnyQrSet({
      ...publicSubmission,
      donationQrImage: publicSubmission.donationQrImage || provisioningQr,
    });

    if (hasQr) {
      continue;
    }

    candidates += 1;
    const label = `${row.slug} (${row.name || ''})`;
    if (!apply) {
      console.log(`[dry-run] would backfill QR for ${label}`);
      continue;
    }

    const doc = await Synagogue.findOne({ slug: row.slug });
    if (!doc) {
      continue;
    }
    await applyDefaultCommunityQrToDocument(doc, { skipIfAnyQr: true });
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
