const fs = require('fs');
const path = require('path');
const { optimizeUploadedImage } = require('./image-optimize');
const { sanitizeSvg } = require('./svg-sanitize');

function isSvgUpload(filePath, mimetype) {
  const ext = path.extname(filePath || '').toLowerCase();
  const mime = String(mimetype || '').toLowerCase();
  return ext === '.svg' || mime === 'image/svg+xml';
}

async function processCommunityLogoUpload(filePath, mimetype) {
  if (!filePath || !fs.existsSync(filePath)) {
    return '';
  }

  if (isSvgUpload(filePath, mimetype)) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const sanitized = sanitizeSvg(raw);
    if (!sanitized) {
      fs.unlinkSync(filePath);
      throw new Error('invalid_svg');
    }

    const dir = path.dirname(filePath);
    const base = path.basename(filePath, path.extname(filePath));
    const filename = `${base}-safe.svg`;
    const target = path.join(dir, filename);
    fs.writeFileSync(target, sanitized, 'utf8');
    if (target !== filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return filename;
  }

  return optimizeUploadedImage(filePath, 'logo');
}

module.exports = {
  isSvgUpload,
  processCommunityLogoUpload,
};
