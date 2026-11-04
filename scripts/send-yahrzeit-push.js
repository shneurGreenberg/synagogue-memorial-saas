#!/usr/bin/env node
/**
 * 1.34.0 I53: run the daily yahrzeit push check by hand (the app also runs it on its own).
 * Usage: node scripts/send-yahrzeit-push.js [--dry-run]
 * Needs WEB_PUSH_PUBLIC_KEY / WEB_PUSH_PRIVATE_KEY in the environment.
 */
require('dotenv').config();

const mongoose = require('mongoose');
const { sendDailyYahrzeitPush } = require('../lib/yahrzeit-push');

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/synagogue', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const result = await sendDailyYahrzeitPush({ dryRun });
  console.log(dryRun ? '[dry-run]' : '', 'Yahrzeit push:', result);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
