#!/usr/bin/env node
// Full public snapshot export (board + design + jewish-content + sidebar-app) for GitHub Pages fallback.
// Read-only. Requires MONGODB_URI. Never logs the URI.
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('../models/Synagogue');
const { loadSynagogueBoard } = require('../lib/load-synagogue-board');
const { toPublicBoardPayload } = require('../lib/public-board');
const { getJewishFeed } = require('../lib/jewish-feed');
const { buildSidebarAppPayload } = require('../lib/sidebar-app-payload');
const TENANTS = (process.argv[2] || 'novosibirsk,tomsk').split(',');
const OUT = path.join(__dirname, '..', 'static-snapshots');
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  await mongoose.connect(process.env.MONGODB_URI);
  for (const slug of TENANTS) {
    const s = await loadSynagogueBoard(slug);
    if (!s) { console.warn('missing', slug); continue; }
    const board = toPublicBoardPayload(s, { includeText: true });
    const lang = s.language || 'ru';
    let jewish = null, sidebar = null;
    try { jewish = await getJewishFeed(lang, s); } catch (e) { console.warn(slug, 'jewish-content failed:', e.message); }
    try { sidebar = await buildSidebarAppPayload(s, lang); } catch (e) { console.warn(slug, 'sidebar-app failed:', e.message); }
    const snap = { ...board, contentVersion: Date.now(), exportedAt: new Date().toISOString(), jewishContent: jewish, sidebarApp: sidebar };
    fs.writeFileSync(path.join(OUT, `${slug}.json`), JSON.stringify(snap, null, 2));
    console.log(slug, 'people', board.people.length, 'keys', Object.keys(board).join(','));
  }
  await mongoose.disconnect();
})().catch((e) => { console.error('export failed:', e.message.replace(/mongodb(\+srv)?:\/\/\S+/g, '[uri]')); process.exit(1); });
