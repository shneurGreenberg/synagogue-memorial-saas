#!/usr/bin/env node
require('dotenv').config();

const mongoose = require('mongoose');
const { sendDailyYahrzeitReminders } = require('../lib/yahrzeit-reminders');

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/synagogue', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const result = await sendDailyYahrzeitReminders({ dryRun });
  console.log(dryRun ? '[dry-run] ' : '', 'Yahrzeit reminders:', result);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
