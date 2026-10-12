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

const DEFAULT_QUALITY = 82;

const PRESETS = {
  logo: {
    maxWidth: 1024,
    maxHeight: 1024,
    quality: DEFAULT_QUALITY,
    preferPngIfAlpha: true,
    defaultFormat: 'webp',
  },
  background: {
    maxWidth: 2560,
    maxHeight: 2560,
    quality: DEFAULT_QUALITY,
    defaultFormat: 'jpeg',
  },
  tilesBackground: {
    maxWidth: 2560,
    maxHeight: 2560,
    quality: DEFAULT_QUALITY,
    defaultFormat: 'jpeg',
  },
  photo: {
    maxWidth: 800,
    maxHeight: 800,
    quality: DEFAULT_QUALITY,
    defaultFormat: 'jpeg',
  },
  qr: {
    maxWidth: 1024,
    maxHeight: 1024,
    quality: DEFAULT_QUALITY,
    preferPngIfAlpha: true,
    defaultFormat: 'png',
  },
  slideshow: {
    maxWidth: 2560,
    maxHeight: 2560,
    quality: DEFAULT_QUALITY,
    defaultFormat: 'jpeg',
  },
};

function formatExtension(format) {
  if (format === 'webp') {
    return '.webp';
  }
  if (format === 'png') {
    return '.png';
  }
  return '.jpg';
}

function resolveOutputFormat(options, hasAlpha) {
  if (options.preferPngIfAlpha && hasAlpha) {
    return 'png';
  }
  return options.defaultFormat || 'jpeg';
}

async function buildOptimizedPipeline(sharpLib, input, presetKey) {
  const options = PRESETS[presetKey] || PRESETS.photo;
  const meta = await sharpLib(input).rotate().metadata();
  const hasAlpha = meta.hasAlpha === true;
  const format = resolveOutputFormat(options, hasAlpha);

  let pipeline = sharpLib(input).rotate().resize({
    width: options.maxWidth,
    height: options.maxHeight,
    fit: 'inside',
    withoutEnlargement: true,
  });

  if (format === 'webp') {
    pipeline = pipeline.webp({ quality: options.quality });
  } else if (format === 'png') {
    pipeline = pipeline.png({ compressionLevel: 9, palette: !hasAlpha });
  } else {
    pipeline = pipeline.jpeg({ quality: options.quality, mozjpeg: true });
  }

  return { pipeline, format, options };
}

async function optimizeImageBuffer(buffer, preset = 'photo') {
  const sharpLib = getSharp();
  if (!buffer || !buffer.length || !sharpLib) {
    return null;
  }

  try {
    const { pipeline, format } = await buildOptimizedPipeline(sharpLib, buffer, preset);
    const output = await pipeline.toBuffer();
    return {
      buffer: output,
      ext: formatExtension(format),
      format,
    };
  } catch (err) {
    console.error('Image buffer optimize failed:', err.message);
    return null;
  }
}

async function optimizeUploadedImage(filePath, preset = 'photo') {
  const sharpLib = getSharp();

  if (!filePath || !fs.existsSync(filePath)) {
    return path.basename(filePath || '');
  }

  if (!sharpLib) {
    return path.basename(filePath);
  }

  try {
    const { pipeline, format } = await buildOptimizedPipeline(sharpLib, filePath, preset);
    const ext = formatExtension(format);
    const dir = path.dirname(filePath);
    const base = path.basename(filePath, path.extname(filePath));
    const outputPath = path.join(dir, `${base}-opt${ext}`);

    await pipeline.toFile(outputPath);

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
  PRESETS,
  getSharp,
  optimizeImageBuffer,
  optimizeUploadedImage,
};
