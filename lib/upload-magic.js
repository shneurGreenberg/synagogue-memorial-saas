// 1.33.0 audit #7: verify uploaded files by their magic bytes, not by the client-sent name/MIME.
const fs = require('fs');

function detectImageType(buf) {
  if (!buf || buf.length < 4) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: '.jpg' };
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { mime: 'image/png', ext: '.png' };
  if (buf.slice(0, 3).toString('ascii') === 'GIF') return { mime: 'image/gif', ext: '.gif' };
  if (buf.length >= 12 && buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return { mime: 'image/webp', ext: '.webp' };
  const head = buf.slice(0, 512).toString('utf8').replace(/^\uFEFF/, '').trimStart().toLowerCase();
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return { mime: 'image/svg+xml', ext: '.svg' };
  return null;
}

function readHead(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(512);
    const n = fs.readSync(fd, buf, 0, 512, 0);
    return buf.slice(0, n);
  } finally {
    fs.closeSync(fd);
  }
}

function safeUnlink(p) {
  try { fs.unlinkSync(p); } catch { /* ignore */ }
}

// Returns null when OK, or an error message. Renames the file so its extension matches the content.
function verifyDiskUpload(file, { allowSvg = false } = {}) {
  if (!file || !file.path) return null;
  let type;
  try { type = detectImageType(readHead(file.path)); } catch { type = null; }
  if (!type || (type.mime === 'image/svg+xml' && !allowSvg)) {
    safeUnlink(file.path);
    return 'Invalid image file';
  }
  file.mimetype = type.mime;
  if (!file.filename.toLowerCase().endsWith(type.ext)) {
    const base = file.filename.replace(/\.[^.]*$/, '');
    const next = `${base}${type.ext}`;
    const nextPath = file.path.slice(0, file.path.length - file.filename.length) + next;
    try {
      fs.renameSync(file.path, nextPath);
      file.filename = next;
      file.path = nextPath;
    } catch { /* keep original name */ }
  }
  return null;
}

function collectFiles(req) {
  const out = [];
  if (req.file) out.push(req.file);
  if (Array.isArray(req.files)) out.push(...req.files);
  else if (req.files && typeof req.files === 'object') Object.values(req.files).forEach((a) => out.push(...a));
  return out;
}

function verifyRequestUploads(req, svgFields = ['logo']) {
  const files = collectFiles(req);
  let error = null;
  files.forEach((f) => {
    if (error) { safeUnlink(f.path); return; }
    error = verifyDiskUpload(f, { allowSvg: svgFields.includes(f.fieldname) });
  });
  if (error) files.forEach((f) => safeUnlink(f.path));
  return error;
}

module.exports = { detectImageType, verifyDiskUpload, verifyRequestUploads };
