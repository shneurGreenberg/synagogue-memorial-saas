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
const NAME_STOPWORDS = new Set([
  'сын',
  'дочь',
  'внук',
  'внучка',
  'жена',
  'муж',
  'и',
  'or',
]);

function indexImagesRecursive(root, maxDepth = 12) {
  const index = new Map();

  function addFile(fullPath, name) {
    const entry = { name, fullPath, relativePath: path.relative(root, fullPath) };
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

/** Match 88 but not inside 188. */
function hasIsolatedMemorialId(filename, id) {
  if (id == null || id < 0) return false;
  const base = path.basename(filename, path.extname(filename));
  const re = new RegExp(`(?:^|[^\\d])${id}(?![0-9])`);
  if (re.test(base)) return true;
  return new RegExp(`№\\s*${id}(?![0-9])`, 'i').test(base);
}

function extractMemorialNumbers(filename) {
  const nums = new Set();
  const base = path.basename(filename, path.extname(filename));

  const signPattern = /№\s*(\d+)/gi;
  let m;
  while ((m = signPattern.exec(filename)) !== null) {
    nums.add(parseInt(m[1], 10));
  }

  const endNum = /(?:^|[\s_\-(])(\d{1,4})$/.exec(base);
  if (endNum) nums.add(parseInt(endNum[1], 10));

  const isolated = /(?:^|[^\d])(\d{1,4})(?![0-9])/g;
  while ((m = isolated.exec(base)) !== null) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 999) nums.add(n);
  }

  return [...nums];
}

function surnameTokens(personName) {
  if (!personName) return [];
  return String(personName)
    .split(/\s+/)
    .map((t) => t.replace(/[()]/g, '').trim())
    .filter((t) => t.length >= 4 && !NAME_STOPWORDS.has(t.toLowerCase()));
}

function parsePhotoReference(ref) {
  const targetName = String(ref || '').trim();
  if (!targetName) return { targetName: '', id: null, slugs: [] };

  const base = path.basename(targetName, path.extname(targetName));
  const parts = base.split('-').filter(Boolean);
  const id = parts.length ? parseInt(parts[0], 10) : NaN;
  const slugs = parts.length > 1 ? parts.slice(1).map((s) => s.toLowerCase()) : [];

  return {
    targetName,
    id: Number.isFinite(id) ? id : null,
    slugs,
  };
}

function scoreCandidate(entry, parsed, personId, personName) {
  const name = entry.name;
  const lower = name.toLowerCase();
  let score = 0;

  if (name === parsed.targetName) return 10000;
  if (lower === parsed.targetName.toLowerCase()) return 9000;

  const wantId = parsed.id != null ? parsed.id : personId;
  const nums = extractMemorialNumbers(name);
  const idMatch =
    wantId != null &&
    (hasIsolatedMemorialId(name, wantId) || nums.includes(wantId));

  if (idMatch) {
    score += 500;
    if (/№\s*\d+/i.test(name)) score += 200;
    if (personId != null && hasIsolatedMemorialId(name, personId)) score += 80;
    for (const slug of parsed.slugs) {
      if (lower.includes(slug)) score += 150;
    }
    if (parsed.slugs.length === 0 && nums.filter((n) => n === wantId).length === 1) score += 50;
    if (lower.length < 50) score += 20;
    return score;
  }

  const tokens = surnameTokens(personName);
  if (tokens.length) {
    let hits = 0;
    for (const token of tokens.slice(0, 2)) {
      if (lower.includes(token.toLowerCase())) hits += 1;
    }
    if (hits >= 1) score += 350 + hits * 50;
  }

  return score;
}

function findUniqueSurnameMatch(entries, personName, wantId) {
  const tokens = surnameTokens(personName);
  if (!tokens.length) return null;

  const primary = tokens[0].toLowerCase();
  const hits = entries.filter((e) => {
    const lower = e.name.toLowerCase();
    if (!lower.includes(primary)) return false;
    if (wantId != null && hasIsolatedMemorialId(e.name, wantId)) return true;
    if (wantId != null && extractMemorialNumbers(e.name).includes(wantId)) return true;
    return true;
  });

  if (hits.length === 1) return hits[0];
  if (hits.length > 1 && wantId != null) {
    const withId = hits.filter((e) => hasIsolatedMemorialId(e.name, wantId));
    if (withId.length === 1) return withId[0];
  }
  return null;
}

function lookupImage(index, filename) {
  if (!filename) return null;
  const trimmed = String(filename).trim();
  if (!trimmed) return null;
  return index.get(trimmed) || index.get(trimmed.toLowerCase()) || null;
}

function resolveImageForReference(index, entries, photoRef, personId, personName) {
  const parsed = parsePhotoReference(photoRef);
  if (!parsed.targetName) return null;

  const exact = lookupImage(index, parsed.targetName);
  if (exact) return { entry: exact, match: 'exact' };

  const wantId = parsed.id != null ? parsed.id : personId;
  let best = null;
  let bestScore = 0;

  for (const entry of entries) {
    const score = scoreCandidate(entry, parsed, personId, personName);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (best && bestScore >= 500) {
    return { entry: best, match: 'memorial-no' };
  }
  if (best && bestScore >= 400) {
    return { entry: best, match: 'name' };
  }

  const unique = findUniqueSurnameMatch(entries, personName, wantId);
  if (unique) return { entry: unique, match: 'surname' };

  return null;
}

function suggestCandidates(entries, photoRef, personId, personName, limit = 5) {
  const parsed = parsePhotoReference(photoRef);
  const wantId = parsed.id != null ? parsed.id : personId;
  const tokens = surnameTokens(personName);
  const scored = [];

  for (const entry of entries) {
    let score = 0;
    if (wantId != null && hasIsolatedMemorialId(entry.name, wantId)) score += 100;
    if (wantId != null && extractMemorialNumbers(entry.name).includes(wantId)) score += 40;
    for (const t of tokens) {
      if (entry.name.toLowerCase().includes(t.toLowerCase())) score += 30;
    }
    if (score > 0) scored.push({ entry, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.entry);
}

function copyReferencedPhotosForPeople(index, people, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const entries = uniqueEntries(index);
  const missing = [];
  const missingDetails = [];
  const matched = [];
  let copied = 0;

  for (const person of people) {
    const photo = person.photo && String(person.photo).trim();
    if (!photo) continue;

    const resolved = resolveImageForReference(
      index,
      entries,
      photo,
      person.id,
      person.name,
    );
    if (!resolved) {
      missing.push(photo);
      missingDetails.push({
        photo,
        id: person.id,
        name: person.name,
        suggestions: suggestCandidates(entries, photo, person.id, person.name),
      });
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

  return { copied, missing, missingDetails, matched };
}

function copyReferencedPhotos(index, photoNames, destDir) {
  const people = photoNames.map((photo, id) => ({ id, photo }));
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
    const hit = resolveImageForReference(
      index,
      entries,
      photo,
      person.id,
      person.name,
    );
    if (hit) ok += 1;
    else missing.push({ id: person.id, name: person.name, photo });
  }

  return { ok, okCount: ok, withPhoto, missing };
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
  suggestCandidates,
  parsePhotoReference,
  extractMemorialNumbers,
  hasIsolatedMemorialId,
  surnameTokens,
};
