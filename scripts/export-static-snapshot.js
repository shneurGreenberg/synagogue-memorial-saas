#!/usr/bin/env node
/**
 * Export static snapshots from MongoDB for GitHub Pages fallback.
 * Reads MONGODB_URI from environment and exports public board data for specified tenants.
 * Output: ./static-snapshots/{slug}.json
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { toPublicBoardPayload } = require('../lib/public-board');

const TENANTS = ['novosibirsk', 'tomsk'];
const OUTPUT_DIR = path.join(__dirname, '..', 'static-snapshots');

async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

async function exportSnapshot(slug) {
  const Synagogue = mongoose.model('Synagogue');
  const board = await Synagogue.findOne({ slug }).lean();
  
  if (!board) {
    console.warn(`⚠️  Board "${slug}" not found in database, skipping`);
    return null;
  }

  const publicPayload = toPublicBoardPayload(board, { includeText: true });
  
  const snapshot = {
    ...publicPayload,
    contentVersion: Date.now(),
    exportedAt: new Date().toISOString(),
  };

  const outputPath = path.join(OUTPUT_DIR, `${slug}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(snapshot, null, 2));
  
  console.log(`✓ Exported ${slug}: ${snapshot.people?.length || 0} people`);
  return snapshot;
}

async function main() {
  console.log('📦 Exporting static snapshots from MongoDB...');
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  try {
    await connectMongo();
    console.log('✓ Connected to MongoDB');

    const exports = [];
    for (const slug of TENANTS) {
      const snapshot = await exportSnapshot(slug);
      if (snapshot) {
        exports.push({ slug, people: snapshot.people?.length || 0 });
      }
    }

    await mongoose.disconnect();
    
    console.log('\n✅ Export complete:');
    exports.forEach(({ slug, people }) => {
      console.log(`   ${slug}: ${people} people`);
    });
    
    if (exports.length === 0) {
      console.warn('\n⚠️  No snapshots were exported');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Export failed:', error.message);
    
    if (error.message.includes('MONGODB_URI')) {
      console.log('\nℹ️  MONGODB_URI not available - this is expected in CI without secrets.');
      console.log('   The workflow will use the last committed snapshots.');
      process.exit(0); // Exit gracefully so CI doesn't fail
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { exportSnapshot };
