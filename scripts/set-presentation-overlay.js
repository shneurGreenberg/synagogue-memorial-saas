#!/usr/bin/env node
/**
 * Enable timed presentation image overlay for a community.
 *
 * Usage:
 *   node scripts/set-presentation-overlay.js --slug=novosibirsk --image=presentation-sander.jpg
 *   node scripts/set-presentation-overlay.js --slug=novosibirsk --image=foo.jpg --intervalMs=180000 --durationMs=10000
 *   node scripts/set-presentation-overlay.js --slug=novosibirsk --disable
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Synagogue = require('../models/Synagogue');
const { invalidateBoardCache } = require('../lib/board-cache');

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  if (hit) return hit.slice(prefix.length);
  if (process.argv.includes(`--${name}`)) return true;
  return fallback;
}

async function main() {
  const slug = arg('slug', 'novosibirsk');
  const disable = Boolean(arg('disable', false));
  const image = arg('image', '');
  const intervalMs = Number(arg('intervalMs', 180000));
  const durationMs = Number(arg('durationMs', 10000));

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI missing');
  }

  await mongoose.connect(uri);
  const syn = await Synagogue.findOne({ slug });
  if (!syn) {
    throw new Error(`Synagogue not found: ${slug}`);
  }

  if (disable) {
    syn.presentationOverlay = { enabled: false, image: '', intervalMs: 180000, durationMs: 10000 };
    await syn.save();
    try { invalidateBoardCache(slug); } catch (_) {}
    console.log(`Disabled presentation overlay for ${slug}`);
    await mongoose.disconnect();
    return;
  }

  if (!image) {
    throw new Error('Provide --image=filename (under images/) or --disable');
  }

  const imagesDir = path.join(__dirname, '..', 'images');
  const localPath = path.join(imagesDir, image);
  if (!fs.existsSync(localPath)) {
    console.warn(`Warning: ${localPath} does not exist yet — upload the file before/with deploy.`);
  }

  syn.presentationOverlay = {
    enabled: true,
    image,
    intervalMs: Number.isFinite(intervalMs) ? intervalMs : 180000,
    durationMs: Number.isFinite(durationMs) ? durationMs : 10000,
  };
  await syn.save();
  try { invalidateBoardCache(slug); } catch (_) {}
  console.log(`Enabled presentation overlay for ${slug}:`, syn.presentationOverlay);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
