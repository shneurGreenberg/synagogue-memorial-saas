const fs = require('fs');
const path = require('path');

let sharp;

function getSharp() {
  if (sharp !== undefined) {
    return sharp;
  }

  try {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    sharp = require('sharp');
  } catch (err) {
    sharp = null;
  }

  return sharp;
}

const PRESETS = {
  logo: {
    maxWidth: 480,
    maxHeight: 180,
    quality: 80,
    format: 'webp',
  },
  background: {
    maxWidth: 1280,
    maxHeight: 720,
    quality: 72,
    format: 'jpeg',
  },
  tilesBackground: {
    maxWidth: 1280,
    maxHeight: 720,
    quality: 72,
    format: 'jpeg',
  },
  photo: {
    maxWidth: 800,
    maxHeight: 800,
    quality: 82,
    format: 'jpeg',
  },
  qr: {
    maxWidth: 512,
    maxHeight: 512,
    quality: 90,
    format: 'png',
  },
};

async function optimizeUploadedImage(filePath, preset = 'photo') {
  const sharpLib = getSharp();

  if (!filePath || !fs.existsSync(filePath)) {
    return path.basename(filePath || '');
  }

  if (!sharpLib) {
    return path.basename(filePath);
  }

  const options = PRESETS[preset] || PRESETS.photo;
  const ext = options.format === 'webp' ? '.webp' : (options.format === 'png' ? '.png' : '.jpg');
  const dir = path.dirname(filePath);
  const base = path.basename(filePath, path.extname(filePath));
  const outputPath = path.join(dir, `${base}-opt${ext}`);

  try {
    let pipeline = sharpLib(filePath).rotate();

    pipeline = pipeline.resize({
      width: options.maxWidth,
      height: options.maxHeight,
      fit: 'inside',
      withoutEnlargement: true,
    });

    if (options.format === 'webp') {
      await pipeline.webp({ quality: options.quality }).toFile(outputPath);
    } else if (options.format === 'png') {
      await pipeline.png({ quality: options.quality }).toFile(outputPath);
    } else {
      await pipeline.jpeg({ quality: options.quality, mozjpeg: true }).toFile(outputPath);
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return path.basename(outputPath);
  } catch (err) {
    console.error('Image optimize failed:', err.message);
    return path.basename(filePath);
  }
}

module.exports = {
  optimizeUploadedImage,
};
