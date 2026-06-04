const fs = require('fs');
const path = require('path');

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const SKIP_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.cursor',
]);

function indexImagesRecursive(root, maxDepth = 12) {
  const index = new Map();

  function addFile(fullPath, name) {
    const entry = {
      name,
      fullPath,
      relativePath: path.relative(root, fullPath),
    };
    if (!index.has(name)) index.set(name, entry);
    const lower = name.toLowerCase();
    if (!index.has(lower)) index.set(lower, entry);
  }

  function walk(dir, depth) {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (SKIP_DIR_NAMES.has(ent.name)) continue;
        walk(full, depth + 1);
        continue;
      }
      if (!ent.isFile()) continue;
      const ext = path.extname(ent.name).toLowerCase();
      if (!IMAGE_EXT.has(ext)) continue;
      addFile(full, ent.name);
    }
  }

  if (fs.existsSync(root) && fs.statSync(root).isDirectory()) {
    walk(root, 0);
  }
  return index;
}

function mergeImageIndexes(...indexes) {
  const merged = new Map();
  for (const idx of indexes) {
    for (const [key, entry] of idx) {
      if (!merged.has(key)) merged.set(key, entry);
    }
  }
  return merged;
}

function uniqueEntries(index) {
  const seen = new Set();
  const list = [];
  for (const entry of index.values()) {
    if (seen.has(entry.fullPath)) continue;
    seen.add(entry.fullPath);
    list.push(entry);
  }
  return list;
}

/** Memorial numbers from Russian filenames like "Кац № 148.jpg" or "№188". */
function extractMemorialNumbers(filename) {
  const nums = new Set();
  const base = path.basename(filename, path.extname(filename));

  const signPattern = /№\s*(\d+)/gi;
  let m;
  while ((m = signPattern.exec(filename)) !== null) {
    nums.add(parseInt(m[1], 10));
  }

  const endNum = /(?:^|[\s_\-])(\d{1,4})$/.exec(base);
  if (endNum) nums.add(parseInt(endNum[1], 10));

  return [...nums];
}

/** Parse database photo field: "148.jpg", "15-sofia.jpg", "18-elz.jpg". */
function parsePhotoReference(ref) {
  const targetName = String(ref || '').trim();
  if (!targetName) return { targetName: '', id: null, slugs: [] };

  const base = path.basename(targetName, path.extname(targetName));
  const parts = base.split('-').filter(Boolean);
  const id = parts.length ? parseInt(parts[0], 10) : NaN;
  const slugs =
    parts.length > 1
      ? parts.slice(1).map((s) => s.toLowerCase())
      : [];

  return {
    targetName,
    id: Number.isFinite(id) ? id : null,
    slugs,
  };
}

function scoreCandidate(entry, parsed, personId) {
  const name = entry.name;
  const lower = name.toLowerCase();
  let score = 0;

  if (name === parsed.targetName) return 10000;
  if (lower === parsed.targetName.toLowerCase()) return 9000;

  const nums = extractMemorialNumbers(name);
  const wantId = parsed.id != null ? parsed.id : personId;

  if (wantId == null || !nums.includes(wantId)) return 0;

  score += 500;
  if (/№\s*\d+/i.test(name)) score += 200;
  if (personId != null && nums.includes(personId)) score += 80;

  for (const slug of parsed.slugs) {
    if (lower.includes(slug)) score += 150;
  }

  if (parsed.slugs.length === 0 && nums.length === 1) score += 50;

  if (lower.length < 40) score += 20;

  return score;
}

function lookupImage(index, filename) {
  if (!filename) return null;
  const trimmed = String(filename).trim();
  if (!trimmed) return null;
  return index.get(trimmed) || index.get(trimmed.toLowerCase()) || null;
}

/**
 * Find source file for a database photo reference (supports Russian № names).
 */
function resolveImageForReference(index, entries, photoRef, personId) {
  const parsed = parsePhotoReference(photoRef);
  if (!parsed.targetName) return null;

  const exact = lookupImage(index, parsed.targetName);
  if (exact) return { entry: exact, match: 'exact' };

  let best = null;
  let bestScore = 0;

  for (const entry of entries) {
    const score = scoreCandidate(entry, parsed, personId);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (best && bestScore >= 500) {
    return { entry: best, match: 'memorial-no' };
  }
  return null;
}

/**
 * Copy photos for people; renames to database filename (e.g. № 148.jpg → 148.jpg).
 */
function copyReferencedPhotosForPeople(index, people, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const entries = uniqueEntries(index);
  const missing = [];
  const matched = [];
  let copied = 0;

  for (const person of people) {
    const photo = person.photo && String(person.photo).trim();
    if (!photo) continue;

    const resolved = resolveImageForReference(index, entries, photo, person.id);
    if (!resolved) {
      missing.push(photo);
      continue;
    }

    const dest = path.join(destDir, photo);
    fs.copyFileSync(resolved.entry.fullPath, dest);
    matched.push({
      photo,
      from: resolved.entry.relativePath || resolved.entry.name,
      match: resolved.match,
    });
    copied += 1;
  }

  return { copied, missing, matched };
}

/** @deprecated Use copyReferencedPhotosForPeople */
function copyReferencedPhotos(index, photoNames, destDir) {
  const people = photoNames.map((photo, i) => ({ id: i, photo }));
  return copyReferencedPhotosForPeople(index, people, destDir);
}

function countImageFiles(index) {
  return uniqueEntries(index).length;
}

function sampleIndexPaths(index, limit = 15) {
  return uniqueEntries(index)
    .slice(0, limit)
    .map((e) => e.relativePath);
}

function countResolvedPhotos(index, people) {
  const entries = uniqueEntries(index);
  let ok = 0;
  let withPhoto = 0;
  const missing = [];

  for (const person of people) {
    const photo = person.photo && String(person.photo).trim();
    if (!photo) continue;
    withPhoto += 1;
    const hit = resolveImageForReference(index, entries, photo, person.id);
    if (hit) ok += 1;
    else missing.push({ id: person.id, name: person.name, photo });
  }

  return { ok, withPhoto, missing };
}

module.exports = {
  IMAGE_EXT,
  indexImagesRecursive,
  mergeImageIndexes,
  lookupImage,
  resolveImageForReference,
  copyReferencedPhotos,
  copyReferencedPhotosForPeople,
  countImageFiles,
  sampleIndexPaths,
  countResolvedPhotos,
  parsePhotoReference,
  extractMemorialNumbers,
};
