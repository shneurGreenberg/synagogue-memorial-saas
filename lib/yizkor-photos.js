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

/**
 * Recursively index image files under root.
 * @returns {Map<string, { name: string, fullPath: string, relativePath: string }>}
 *   Keys: exact filename and lowercase filename (first wins for each key).
 */
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

/** Merge multiple indexes; later roots do not override earlier hits for same key. */
function mergeImageIndexes(...indexes) {
  const merged = new Map();
  for (const idx of indexes) {
    for (const [key, entry] of idx) {
      if (!merged.has(key)) merged.set(key, entry);
    }
  }
  return merged;
}

function lookupImage(index, filename) {
  if (!filename) return null;
  const trimmed = String(filename).trim();
  if (!trimmed) return null;
  return index.get(trimmed) || index.get(trimmed.toLowerCase()) || null;
}

/**
 * Copy referenced photos into project photos/ directory.
 * @returns {{ copied: number, missing: string[], foundPaths: string[] }}
 */
function copyReferencedPhotos(index, photoNames, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  const unique = [...new Set(photoNames.filter(Boolean))];
  const missing = [];
  const foundPaths = [];
  let copied = 0;

  for (const name of unique) {
    const hit = lookupImage(index, name);
    if (!hit) {
      missing.push(name);
      continue;
    }
    const dest = path.join(destDir, name);
    fs.copyFileSync(hit.fullPath, dest);
    foundPaths.push(hit.relativePath);
    copied += 1;
  }
  return { copied, missing, foundPaths };
}

function countImageFiles(index) {
  const seen = new Set();
  for (const entry of index.values()) {
    seen.add(entry.fullPath);
  }
  return seen.size;
}

function sampleIndexPaths(index, limit = 15) {
  const seen = new Set();
  const samples = [];
  for (const entry of index.values()) {
    if (seen.has(entry.fullPath)) continue;
    seen.add(entry.fullPath);
    samples.push(entry.relativePath);
    if (samples.length >= limit) break;
  }
  return samples;
}

module.exports = {
  IMAGE_EXT,
  indexImagesRecursive,
  mergeImageIndexes,
  lookupImage,
  copyReferencedPhotos,
  countImageFiles,
  sampleIndexPaths,
};
