#!/usr/bin/env node
/**
 * Test MongoDB connection from .env (no data changes).
 * Usage: node scripts/check-mongo.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;

function maskUri(value) {
  if (!value) return '(empty)';
  return value.replace(/:([^:@/]+)@/, ':***@');
}

function diagnoseUri(value) {
  const issues = [];
  if (!value) {
    issues.push('MONGODB_URI is missing in .env');
    return issues;
  }
  if (value.includes('<password>') || value.includes('<PASSWORD>')) {
    issues.push('Replace <password> in the URI with your real database user password');
  }
  if (/%3C|%3E/i.test(value)) {
    issues.push('URI still contains encoded < or > — use the real password, not placeholders');
  }
  if (!value.startsWith('mongodb://') && !value.startsWith('mongodb+srv://')) {
    issues.push('URI must start with mongodb:// or mongodb+srv://');
  }
  const match = value.match(/^mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/);
  if (!match) {
    issues.push('URI should look like: mongodb+srv://USERNAME:PASSWORD@cluster....mongodb.net/synagogue');
  } else {
    const user = decodeURIComponent(match[2]);
    const pass = decodeURIComponent(match[3]);
    if (pass.includes(' ') || pass.includes('"') || pass.includes("'")) {
      issues.push('Password must not contain spaces or quotes');
    }
    const special = /[@#/:?&=%+]/.test(pass);
    if (special) {
      issues.push(
        'Password has special characters — URL-encode them in the URI (e.g. @ → %40, # → %23).',
      );
      issues.push(`Atlas helper: https://www.mongodb.com/docs/atlas/troubleshoot-connection/#special-characters-in-password`);
    }
    if (!user.trim()) {
      issues.push('Database username is empty');
    }
  }
  return issues;
}

async function main() {
  console.log('MONGODB_URI:', maskUri(uri));
  const hints = diagnoseUri(uri);
  if (hints.length) {
    console.log('\nPossible problems:');
    hints.forEach((h) => console.log('  -', h));
  }

  if (!uri) {
    process.exit(1);
  }

  mongoose.set('strictQuery', false);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    await mongoose.connection.db.admin().ping();
    console.log('\nOK — connected and authenticated successfully.');
    await mongoose.disconnect();
  } catch (err) {
    console.error('\nConnection failed:', err.message);
    if (err.code === 8000 || err.codeName === 'AtlasError') {
      console.error('\nAtlas "bad auth" — usually fix by:');
      console.error('  1. Atlas → Database Access → your DB user → Edit → Reset Password');
      console.error('  2. Copy NEW connection string → Connect → Drivers → Node.js');
      console.error('  3. Replace <password> with the new password (URL-encode if it has @ # : / etc.)');
      console.error('  4. Use the DATABASE user name (e.g. admin), not your Atlas login email');
      console.error('  5. Append database name if missing: ...mongodb.net/synagogue?retryWrites=true&w=majority');
    }
    process.exit(1);
  }
}

main();
