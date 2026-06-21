#!/usr/bin/env node
require('dotenv').config();

const { isEmailConfigured, sendMail } = require('../lib/email');

async function main() {
  const to = process.argv[2] || process.env.SMTP_TEST_TO || process.env.SMTP_USER;

  if (!isEmailConfigured()) {
    console.error('SMTP is not configured.');
    console.error('');
    console.error('Add these to your .env file:');
    console.error('  SMTP_HOST=smtp.example.com');
    console.error('  SMTP_FROM=reminders@your-domain.com');
    console.error('  SMTP_PORT=587');
    console.error('  SMTP_USER=your-login');
    console.error('  SMTP_PASS=your-password');
    console.error('');
    console.error('See docs/SMTP-HE.md for provider examples.');
    process.exit(1);
  }

  if (!to) {
    console.error('Usage: node scripts/test-smtp.js you@example.com');
    console.error('Or set SMTP_TEST_TO in .env');
    process.exit(1);
  }

  console.log('Sending test email...');
  console.log('  Host:', process.env.SMTP_HOST);
  console.log('  From:', process.env.SMTP_FROM);
  console.log('  To:  ', to);

  await sendMail({
    to,
    subject: 'Synagogue memorial — SMTP test',
    text: 'If you received this email, SMTP is configured correctly.\n\nYahrzeit daily reminders can now be sent.',
  });

  console.log('Success! Check the inbox for:', to);
}

main().catch((err) => {
  console.error('Failed to send test email:');
  console.error(err.message || err);
  process.exit(1);
});
