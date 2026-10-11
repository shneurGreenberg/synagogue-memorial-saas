#!/usr/bin/env node
// Full public snapshot export (board + design + jewish-content + sidebar-app) for GitHub Pages fallback.
// Read-only. Requires MONGODB_URI. Never logs the URI.
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('../models/Synagogue');
const { loadSynagogueBoard } = require('../lib/load-synagogue-board');
const { toPublicBoardPayload } = require('../lib/public-board');
const { normalizePersonDeathDate } = require('../lib/death-date');
const { getJewishFeed } = require('../lib/jewish-feed');
const { buildSidebarAppPayload } = require('../lib/sidebar-app-payload');

const TENANTS = (process.argv[2] || 'novosibirsk,tomsk').split(',');
const OUT = path.join(__dirname, '..', 'static-snapshots');

async function findDatabaseWithSynagogues(uri, targetSlugs) {
  // First try the default database from URI
  await mongoose.connect(uri);
  
  const Synagogue = mongoose.model('Synagogue');
  let count = await Synagogue.countDocuments({});
  
  if (count > 0) {
    const found = await Synagogue.countDocuments({ slug: { $in: targetSlugs } });
    console.log(`✓ Using default database: ${count} synagogues, ${found} target slugs found`);
    return;
  }
  
  console.log('Default database has no synagogues, searching all databases...');
  await mongoose.disconnect();
  
  // List all databases and find one with synagogues
  const adminUri = uri.replace(/\/[^/?]*(\?|$)/, '/$1'); // Connect to admin/default
  await mongoose.connect(adminUri);
  
  const admin = mongoose.connection.db.admin();
  const { databases } = await admin.listDatabases();
  
  console.log(`Found ${databases.length} databases to check`);
  
  for (const dbInfo of databases) {
    if (dbInfo.name === 'admin' || dbInfo.name === 'local' || dbInfo.name === 'config') {
      continue;
    }
    
    await mongoose.disconnect();
    const dbUri = uri.replace(/\/[^/?]*(\?|$)/, `/${dbInfo.name}$1`);
    await mongoose.connect(dbUri);
    
    const Synagogue = mongoose.model('Synagogue');
    const count = await Synagogue.countDocuments({});
    
    if (count > 0) {
      const found = await Synagogue.countDocuments({ slug: { $in: targetSlugs } });
      console.log(`✓ Found database "${dbInfo.name}": ${count} synagogues, ${found} target slugs`);
      if (found > 0) {
        return;
      }
    }
  }
  
  throw new Error('No database found with target synagogue slugs');
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  
  if (!process.env.MONGODB_URI) {
    console.log('\nℹ️  MONGODB_URI not available - this is expected in CI without secrets.');
    console.log('   The workflow will use the last committed snapshots.');
    process.exit(0);
  }
  
  try {
    await findDatabaseWithSynagogues(process.env.MONGODB_URI, TENANTS);
    console.log('✓ Connected to MongoDB');
    
    const exports = [];
    for (const slug of TENANTS) {
      const s = await loadSynagogueBoard(slug);
      if (!s) {
        console.warn(`⚠️  Board "${slug}" not found in database, skipping`);
        continue;
      }
      
      const board = toPublicBoardPayload(s, { includeText: true });
      if (Array.isArray(board.people)) {
        board.people = board.people.map(normalizePersonDeathDate);
      }
      const lang = s.language || 'ru';
      let jewish = null, sidebar = null;
      
      try {
        jewish = await getJewishFeed(lang, s);
      } catch (e) {
        console.warn(`${slug}: jewish-content failed: ${e.message}`);
      }
      
      try {
        sidebar = await buildSidebarAppPayload(s, lang);
      } catch (e) {
        console.warn(`${slug}: sidebar-app failed: ${e.message}`);
      }
      
      const snap = {
        ...board,
        contentVersion: Date.now(),
        exportedAt: new Date().toISOString(),
        jewishContent: jewish,
        sidebarApp: sidebar,
      };
      
      fs.writeFileSync(path.join(OUT, `${slug}.json`), JSON.stringify(snap, null, 2));
      exports.push({ slug, people: board.people?.length || 0 });
      console.log(`✓ Exported ${slug}: ${board.people?.length || 0} people, ${Object.keys(board).length} board fields`);
    }
    
    await mongoose.disconnect();
    
    if (exports.length === 0) {
      console.warn('\n⚠️  No snapshots were exported - keeping existing snapshots');
      process.exit(0);
    }
    
    console.log('\n✅ Export complete:');
    exports.forEach(({ slug, people }) => {
      console.log(`   ${slug}: ${people} people`);
    });
  } catch (error) {
    console.error('\n❌ Export failed:', error.message.replace(/mongodb(\+srv)?:\/\/[^\s]+/gi, '[MONGODB_URI]'));
    console.log('\n⚠️  Keeping existing snapshots to avoid data loss');
    process.exit(0);
  }
})();
