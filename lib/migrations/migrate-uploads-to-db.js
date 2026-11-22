/**
 * Copy persistent-disk uploads into GridFS bucket `uploads`.
 *
 * Does not consult IMAGE_STORE. Dry-run writes nothing.
 * Apply records inserted/replaced ids on `upload_migration_runs` (runId prefix `up-`).
 * Replaced GridFS files are copied to bucket `uploads_backup` before the new bytes replace them.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  IMAGES_DIR,
  PHOTOS_DIR,
  BUNDLED_IMAGES_DIR,
  BUNDLED_PHOTOS_DIR,
  PHOTO_CACHE_DIR,
} = require('../storage-paths');
const {
  BACKUP_BUCKET,
  sha256,
  safeRelativeName,
  storageKey,
  contentTypeFor,
  putFileUnchecked,
  openBucket,
  getDb,
  findLatest,
  metaFromDoc,
} = require('../image-store');

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']);
const RUNS = 'upload_migration_runs';

function mb(bytes) {
  return Math.round((Number(bytes) || 0) / (1024 * 1024) * 100) / 100;
}

function isTempName(name) {
  const base = name.split('/').pop();
  return base.startsWith('.') || base.includes('.tmp') || base.endsWith('.upload');
}

function walkFiles(root) {
  if (!root || !fs.existsSync(root)) {
    return [];
  }
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '.photo-cache') {
          continue;
        }
        stack.push(full);
      } else if (entry.isFile()) {
        out.push(full);
      }
    }
  }
  return out;
}

function relativeName(root, filePath) {
  return path.relative(root, filePath).split(path.sep).join('/');
}

function sameAsBundled(kind, name, diskSha, roots) {
  const bundledBase = kind === 'photos'
    ? (roots.bundledPhotosDir || BUNDLED_PHOTOS_DIR)
    : (roots.bundledImagesDir || BUNDLED_IMAGES_DIR);
  const bundled = path.resolve(bundledBase, ...name.split('/'));
  const root = path.resolve(bundledBase);
  const rel = path.relative(root, bundled);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel) || !fs.existsSync(bundled)) {
    return false;
  }
  try {
    const stat = fs.statSync(bundled);
    if (!stat.isFile()) {
      return false;
    }
    return sha256(fs.readFileSync(bundled)) === diskSha;
  } catch (err) {
    return false;
  }
}

function collectCandidates(roots = {}) {
  const imagesRoot = roots.imagesDir || IMAGES_DIR;
  const photosRoot = roots.photosDir || PHOTOS_DIR;
  const cacheRoot = path.resolve(roots.photoCacheDir || PHOTO_CACHE_DIR);
  const groups = [
    ['images', imagesRoot],
    ['photos', photosRoot],
  ];
  const files = [];
  const counts = {
    scanned: 0,
    skippedNonImage: 0,
    skippedTemp: 0,
    skippedBundled: 0,
  };
  for (const [kind, root] of groups) {
    for (const filePath of walkFiles(root)) {
      const resolved = path.resolve(filePath);
      if (resolved === cacheRoot || resolved.startsWith(`${cacheRoot}${path.sep}`)) {
        continue;
      }
      counts.scanned += 1;
      const name = relativeName(root, filePath);
      if (name.split('/').includes('.photo-cache') || name.split('/').includes('onboarding-pending')) {
        counts.skippedTemp += 1;
        continue;
      }
      if (isTempName(name)) {
        counts.skippedTemp += 1;
        continue;
      }
      const ext = path.posix.extname(name).toLowerCase();
      if (!IMAGE_EXT.has(ext)) {
        counts.skippedNonImage += 1;
        continue;
      }
      let safeName;
      try {
        safeName = safeRelativeName(name);
      } catch (err) {
        counts.skippedTemp += 1;
        continue;
      }
      const buffer = fs.readFileSync(filePath);
      const digest = sha256(buffer);
      if (sameAsBundled(kind, safeName, digest, roots)) {
        counts.skippedBundled += 1;
        continue;
      }
      const stat = fs.statSync(filePath);
      files.push({
        kind,
        name: safeName,
        filePath,
        size: buffer.length,
        sha256: digest,
        mtimeMs: stat.mtimeMs,
        contentType: contentTypeFor(safeName),
      });
    }
  }
  return { files, counts };
}

async function dbSizeReport() {
  const db = getDb();
  if (!db || typeof db.stats !== 'function') {
    return { dataSizeMB: null, storageSizeMB: null, indexSizeMB: null };
  }
  const stats = await db.stats();
  return {
    dataSizeMB: mb(stats.dataSize),
    storageSizeMB: mb(stats.storageSize),
    indexSizeMB: mb(stats.indexSize),
  };
}

function emptyReport(mode, runId) {
  return {
    mode,
    runId: runId || null,
    scanned: 0,
    skippedNonImage: 0,
    skippedTemp: 0,
    skippedBundled: 0,
    alreadySame: 0,
    conflicts: 0,
    inserted: 0,
    replaced: 0,
    bytes: 0,
    largest: [],
    db: { dataSizeMB: null, storageSizeMB: null, indexSizeMB: null },
  };
}

async function readGridBuffer(bucket, id) {
  const chunks = [];
  await new Promise((resolve, reject) => {
    const stream = bucket.openDownloadStream(id);
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', resolve);
  });
  return Buffer.concat(chunks);
}

async function copyToBackup(doc, runId) {
  const backup = openBucket(BACKUP_BUCKET);
  const source = openBucket('uploads');
  if (!backup || !source) {
    throw new Error('image store database is not connected');
  }
  const buffer = await readGridBuffer(source, doc._id);
  const uploaded = await putStreamOnBucket(backup, doc.filename, buffer, {
    ...(doc.metadata || {}),
    backupOf: String(doc._id),
    runId,
  });
  return uploaded.id;
}

function putStreamOnBucket(bucket, filename, buffer, metadata) {
  const { Readable } = require('stream');
  const { pipeline } = require('stream/promises');
  const upload = bucket.openUploadStream(filename, {
    metadata,
    contentType: metadata.contentType,
  });
  return pipeline(Readable.from(buffer), upload).then(() => ({ id: upload.id }));
}

async function runUploadsMigration(options = {}) {
  const mode = String(options.mode || 'dry-run');
  if (!['dry-run', 'apply', 'restore'].includes(mode)) {
    const error = new Error('mode must be dry-run, apply or restore');
    error.code = 'bad_mode';
    throw error;
  }
  if (mode === 'restore') {
    return restoreUploadsMigration(options.runId);
  }

  const report = emptyReport(mode, null);
  const { files, counts } = collectCandidates(options);
  Object.assign(report, counts);
  report.largest = files.map((file) => file.size).sort((a, b) => b - a).slice(0, 8);
  report.db = await dbSizeReport();

  const bucket = openBucket('uploads');
  if (!bucket && files.length) {
    const error = new Error('image store database is not connected');
    error.code = 'no_db';
    throw error;
  }

  const planned = [];
  for (const file of files) {
    const key = storageKey(file.kind, file.name);
    const docs = bucket ? await findLatest(bucket, key) : [];
    const current = metaFromDoc(docs[0]);
    if (current && current.sha256 && current.sha256 === file.sha256) {
      report.alreadySame += 1;
      continue;
    }
    if (current && current.sha256 && current.sha256 !== file.sha256) {
      const dbTime = current.uploadDate ? current.uploadDate.getTime() : 0;
      if (file.mtimeMs <= dbTime) {
        report.conflicts += 1;
        continue;
      }
      planned.push({ file, action: 'replace', previous: docs[0] });
      continue;
    }
    planned.push({ file, action: 'insert', previous: null });
  }

  report.bytes = planned.reduce((sum, item) => sum + item.file.size, 0);
  if (mode === 'dry-run') {
    report.inserted = 0;
    report.replaced = 0;
    return report;
  }

  const runId = `up-${crypto.randomBytes(8).toString('hex')}`;
  report.runId = runId;
  const entries = [];
  for (const item of planned) {
    let backupId = null;
    if (item.action === 'replace' && item.previous) {
      backupId = await copyToBackup(item.previous, runId);
    }
    const saved = await putFileUnchecked(item.file.kind, item.file.name, item.file.filePath);
    entries.push({
      action: item.action,
      key: storageKey(item.file.kind, item.file.name),
      id: saved.id,
      previousId: item.previous ? item.previous._id : null,
      backupId,
    });
    if (item.action === 'replace') {
      report.replaced += 1;
    } else {
      report.inserted += 1;
    }
  }

  const db = getDb();
  if (db) {
    await db.collection(RUNS).insertOne({
      runId,
      createdAt: new Date(),
      entries,
    });
  }
  return report;
}

async function restoreUploadsMigration(runId) {
  const id = String(runId || '').trim();
  if (!id.startsWith('up-')) {
    const error = new Error('runId is required');
    error.code = 'bad_run';
    throw error;
  }
  const db = getDb();
  const bucket = openBucket('uploads');
  const backup = openBucket(BACKUP_BUCKET);
  if (!db || !bucket || !backup) {
    const error = new Error('image store database is not connected');
    error.code = 'no_db';
    throw error;
  }
  const run = await db.collection(RUNS).findOne({ runId: id });
  const report = emptyReport('restore', id);
  if (!run) {
    report.missing = true;
    return report;
  }
  let removed = 0;
  let restored = 0;
  for (const entry of run.entries || []) {
    if (entry.id) {
      try {
        await bucket.delete(entry.id);
        removed += 1;
      } catch (err) {
        /* already gone */
      }
    }
    if (entry.action === 'replace' && entry.backupId) {
      const buffer = await readGridBuffer(backup, entry.backupId);
      const docs = await findLatest(backup, entry.key).catch(() => []);
      const backupDoc = docs.find((doc) => String(doc._id) === String(entry.backupId))
        || { metadata: {} };
      await putStreamOnBucket(bucket, entry.key, buffer, {
        ...(backupDoc.metadata || {}),
        restoredFrom: id,
      });
      restored += 1;
    }
  }
  report.removed = removed;
  report.restored = restored;
  return report;
}

function migrationModeFromEnv(env = process.env) {
  const mode = String(env.UPLOADS_MIGRATION || '').trim().toLowerCase();
  if (!mode) {
    return null;
  }
  if (!['dry-run', 'apply'].includes(mode)) {
    return null;
  }
  if (mode === 'apply' && String(env.UPLOADS_MIGRATION_CONFIRM || '') !== 'APPLY') {
    return { skipped: true, reason: 'confirm' };
  }
  return { mode };
}

async function runUploadsMigrationFromEnv(env = process.env) {
  const plan = migrationModeFromEnv(env);
  if (!plan) {
    return null;
  }
  if (plan.skipped) {
    console.warn('[uploads-migration] apply skipped (set UPLOADS_MIGRATION_CONFIRM=APPLY)');
    return { skipped: true };
  }
  try {
    const report = await runUploadsMigration({ mode: plan.mode });
    console.log(`[uploads-migration] ${JSON.stringify(report)}`);
    return report;
  } catch (err) {
    console.error(`[uploads-migration] ${err && err.message ? err.message : err}`);
    return { error: true };
  }
}

module.exports = {
  RUNS,
  collectCandidates,
  runUploadsMigration,
  restoreUploadsMigration,
  runUploadsMigrationFromEnv,
  migrationModeFromEnv,
};
