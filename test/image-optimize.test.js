const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const {
  optimizeImageBuffer,
  PRESETS,
  getSharp,
} = require('../lib/image-optimize');

describe('image optimize', () => {
  it('requires sharp', () => {
    assert.ok(getSharp());
  });

  it('downscales large photos to the photo preset bounds', async () => {
    const source = await sharp({
      create: {
        width: 2400,
        height: 1800,
        channels: 3,
        background: { r: 120, g: 80, b: 40 },
      },
    })
      .jpeg()
      .toBuffer();

    const result = await optimizeImageBuffer(source, 'photo');
    assert.ok(result && result.buffer.length > 0);
    assert.equal(result.ext, '.jpg');

    const meta = await sharp(result.buffer).metadata();
    assert.ok(meta.width <= PRESETS.photo.maxWidth);
    assert.ok(meta.height <= PRESETS.photo.maxHeight);
  });

  it('auto-rotates using EXIF orientation', async () => {
    const source = await sharp({
      create: {
        width: 400,
        height: 200,
        channels: 3,
        background: { r: 10, g: 20, b: 30 },
      },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();

    const result = await optimizeImageBuffer(source, 'photo');
    assert.ok(result);
    const meta = await sharp(result.buffer).metadata();
    assert.equal(meta.width, 200);
    assert.equal(meta.height, 400);
  });

  it('keeps PNG output for QR images with alpha', async () => {
    const source = await sharp({
      create: {
        width: 2000,
        height: 2000,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer();

    const result = await optimizeImageBuffer(source, 'qr');
    assert.ok(result);
    assert.equal(result.ext, '.png');
    const meta = await sharp(result.buffer).metadata();
    assert.ok(meta.width <= PRESETS.qr.maxWidth);
    assert.ok(meta.hasAlpha);
  });
});
