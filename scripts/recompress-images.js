#!/usr/bin/env node
// 1.33.0 audit #5: one-time in-place recompression of existing board photos/images.
// DRY RUN by default. Keeps the same filename and format (so DB references stay valid);
// only rewrites a file when the result is at least 15% smaller. Skips GIF/SVG.
// Usage: node scripts/recompress-images.js [--apply] [--dir=photos|images]
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { IMAGES_DIR, PHOTOS_DIR } = require('../lib/storage-paths');

const apply = process.argv.includes('--apply');
const dirArg = (process.argv.find((a) => a.startsWith('--dir=')) || '').split('=')[1];
const dirs = dirArg === 'images' ? [IMAGES_DIR] : dirArg === 'photos' ? [PHOTOS_DIR] : [PHOTOS_DIR, IMAGES_DIR];

(async () => {
  let before = 0; let after = 0; let changed = 0;
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      const ext = path.extname(name).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) continue;
      const file = path.join(dir, name);
      const size = fs.statSync(file).size;
      if (size < 200 * 1024) continue;
      const max = dir === PHOTOS_DIR ? 1200 : 1920;
      let img = sharp(file).rotate().resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true });
      if (ext === '.png') img = img.png({ compressionLevel: 9, palette: true });
      else if (ext === '.webp') img = img.webp({ quality: 75 });
      else img = img.jpeg({ quality: 80, mozjpeg: true });
      const out = await img.toBuffer();
      if (out.length > size * 0.85) continue;
      before += size; after += out.length; changed += 1;
      console.log(`${apply ? 'rewrite' : 'would rewrite'} ${name}: ${Math.round(size / 1024)}KB -> ${Math.round(out.length / 1024)}KB`);
      if (apply) fs.writeFileSync(file, out);
    }
  }
  console.log(`${changed} files, ${Math.round(before / 1048576)}MB -> ${Math.round(after / 1048576)}MB${apply ? '' : ' (dry run)'}`);
})();
