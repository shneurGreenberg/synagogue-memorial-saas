#!/usr/bin/env node
/**
 * Split candle.webp into a static wax base + smaller animated flame strip.
 * Run: node scripts/split-candle-assets.js
 */
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'images', 'candle.webp');
const BASE_OUT = path.join(ROOT, 'images', 'candle-base.webp');
const FLAME_OUT = path.join(ROOT, 'images', 'candle-flame.webp');

const FRAME_WIDTH = 104;
const FRAME_HEIGHT = 200;
const FLAME_HEIGHT = 72;
const BASE_TOP = FLAME_HEIGHT;
const BASE_HEIGHT = FRAME_HEIGHT - FLAME_HEIGHT;
const FLAME_FRAMES = 120;

async function main() {
  await sharp(SOURCE, { animated: false, page: 0 })
    .extract({
      left: 0,
      top: BASE_TOP,
      width: FRAME_WIDTH,
      height: BASE_HEIGHT,
    })
    .webp({ quality: 82, effort: 4 })
    .toFile(BASE_OUT);

  await sharp(SOURCE, { animated: true, pages: FLAME_FRAMES })
    .extract({
      left: 0,
      top: 0,
      width: FRAME_WIDTH,
      height: FLAME_HEIGHT,
    })
    .webp({
      quality: 72,
      effort: 4,
      loop: 0,
      delay: 80,
    })
    .toFile(FLAME_OUT);

  const baseStat = await sharp(BASE_OUT).metadata();
  const flameStat = await sharp(FLAME_OUT, { animated: true }).metadata();

  console.log('candle-base.webp', BASE_HEIGHT, 'px tall');
  console.log('candle-flame.webp', FLAME_HEIGHT, 'px tall,', flameStat.pages, 'frames');
  console.log('Saved:', BASE_OUT, FLAME_OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
