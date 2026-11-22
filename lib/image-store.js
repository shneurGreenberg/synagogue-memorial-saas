/**
 * Shared uploads in MongoDB GridFS (bucket `uploads`).
 *
 * Enabled only when IMAGE_STORE=db. When IMAGE_STORE is unset (or any other
 * value), put/get/delete/ensureLocalCopy and the static middleware do not
 * read or write the database. Disk files under IMAGES_DIR / PHOTOS_DIR stay
 * the source of truth, exactly as before.
 *
 * GridFS key: `${kind}/${relative name}` where kind is `images` or `photos`.
 * The relative name keeps subdirectory URLs (`saved-views/…`, `community-qr/…`)
 * and rejects path traversal. Each path segment must be a plain basename.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const {
  IMAGES_DIR,
  PHOTOS_DIR,
  PHOTO_CACHE_DIR,
} = require('./storage-paths');

const BUCKET = 'uploads';
const BACKUP_BUCKET = 'uploads_backup';
const CACHE_MS = 60 * 1000;

const CONTENT_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const metaCache = new Map();
let backendOverride = null;
let rootOverride = null;
let loggedStoreError = false;
let nowFn = () => Date.now();

function isImageStoreEnabled(env = process.env) {
  return String(env.IMAGE_STORE || '').trim().toLowerCase() === 'db';
}

function setNowForTests(fn) {
  nowFn = typeof fn === 'function' ? fn : (() => Date.now());
}

function useImageStoreBackend(backend) {
  backendOverride = backend || null;
  metaCache.clear();
  loggedStoreError = false;
}

function setStorageRootsForTests(roots) {
  rootOverride = roots || null;
}

function resetImageStoreForTests() {
  backendOverride = null;
  rootOverride = null;
  metaCache.clear();
  loggedStoreError = false;
  nowFn = () => Date.now();
}

function logStoreError(err) {
  if (loggedStoreError) {
    return;
  }
  loggedStoreError = true;
  const message = err && err.message ? err.message : String(err);
  console.error(`[image-store] ${message}`);
}

function getDb() {
  if (backendOverride && backendOverride.db) {
    return backendOverride.db;
  }
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    return null;
  }
  return mongoose.connection.db || null;
}

function openBucket(name) {
  if (backendOverride && typeof backendOverride.bucket === 'function') {
    return backendOverride.bucket(name);
  }
  const db = getDb();
  if (!db) {
    return null;
  }
  return new GridFSBucket(db, { bucketName: name });
}

function assertKind(kind) {
  if (kind !== 'images' && kind !== 'photos') {
    const error = new Error('invalid image kind');
    error.code = 'invalid_kind';
    throw error;
  }
}

function safeRelativeName(name) {
  const raw = String(name || '').replace(/\\/g, '/').trim();
  if (!raw || raw.includes('\0') || raw.startsWith('/')) {
    const error = new Error('invalid upload name');
    error.code = 'invalid_name';
    throw error;
  }
  const parts = raw.split('/');
  if (!parts.length || parts.some((part) => !part || part === '.' || part === '..' || part !== path.posix.basename(part))) {
    const error = new Error('invalid upload name');
    error.code = 'invalid_name';
    throw error;
  }
  return parts.join('/');
}

function storageKey(kind, name) {
  assertKind(kind);
  return `${kind}/${safeRelativeName(name)}`;
}

function contentTypeFor(name) {
  const ext = path.posix.extname(safeRelativeName(name)).toLowerCase();
  return CONTENT_TYPES[ext] || 'application/octet-stream';
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function readSource(source) {
  if (Buffer.isBuffer(source)) {
    return source;
  }
  if (typeof source === 'string') {
    return fs.promises.readFile(source);
  }
  const error = new Error('upload source must be a buffer or path');
  error.code = 'invalid_source';
  throw error;
}

function cacheGet(key) {
  const hit = metaCache.get(key);
  if (!hit) {
    return undefined;
  }
  if (hit.expires <= nowFn()) {
    metaCache.delete(key);
    return undefined;
  }
  return hit.value;
}

function cacheSet(key, value) {
  metaCache.set(key, { value, expires: nowFn() + CACHE_MS });
}

function cacheDrop(key) {
  metaCache.delete(key);
}

async function findLatest(bucket, filename) {
  const cursor = bucket.find({ filename });
  const docs = typeof cursor.toArray === 'function' ? await cursor.toArray() : [];
  docs.sort((a, b) => new Date(b.uploadDate || 0) - new Date(a.uploadDate || 0));
  return docs;
}

function metaFromDoc(doc) {
  if (!doc) {
    return null;
  }
  const metadata = doc.metadata || {};
  return {
    id: doc._id,
    filename: doc.filename,
    contentType: metadata.contentType || doc.contentType || 'application/octet-stream',
    size: Number(metadata.size != null ? metadata.size : doc.length) || 0,
    sha256: metadata.sha256 || '',
    kind: metadata.kind,
    name: metadata.name,
    uploadDate: doc.uploadDate ? new Date(doc.uploadDate) : null,
  };
}

async function putFileUnchecked(kind, name, source) {
  const key = storageKey(kind, name);
  const safeName = safeRelativeName(name);
  const buffer = await readSource(source);
  const bucket = openBucket(BUCKET);
  if (!bucket) {
    const error = new Error('image store database is not connected');
    error.code = 'no_db';
    throw error;
  }
  const digest = sha256(buffer);
  const metadata = {
    contentType: contentTypeFor(safeName),
    size: buffer.length,
    sha256: digest,
    kind,
    name: safeName,
  };
  const upload = bucket.openUploadStream(key, {
    metadata,
    contentType: metadata.contentType,
  });
  await pipeline(Readable.from(buffer), upload);
  const newId = upload.id;
  const existing = await findLatest(bucket, key);
  for (const doc of existing) {
    if (String(doc._id) === String(newId)) {
      continue;
    }
    await bucket.delete(doc._id);
  }
  cacheDrop(key);
  return metaFromDoc({
    _id: newId,
    filename: key,
    length: buffer.length,
    uploadDate: new Date(nowFn()),
    metadata,
    contentType: metadata.contentType,
  });
}

async function putFile(kind, name, source) {
  if (!isImageStoreEnabled()) {
    return { stored: false };
  }
  return putFileUnchecked(kind, name, source);
}

async function getMeta(kind, name) {
  if (!isImageStoreEnabled()) {
    return null;
  }
  let key;
  try {
    key = storageKey(kind, name);
  } catch (err) {
    return null;
  }
  const cached = cacheGet(key);
  if (cached !== undefined) {
    return cached;
  }
  const bucket = openBucket(BUCKET);
  if (!bucket) {
    return null;
  }
  const docs = await findLatest(bucket, key);
  const meta = metaFromDoc(docs[0]);
  cacheSet(key, meta);
  return meta;
}

async function openStream(kind, name) {
  if (!isImageStoreEnabled()) {
    return null;
  }
  const meta = await getMeta(kind, name);
  if (!meta) {
    return null;
  }
  const bucket = openBucket(BUCKET);
  if (!bucket) {
    return null;
  }
  return bucket.openDownloadStream(meta.id);
}

async function deleteFile(kind, name) {
  if (!isImageStoreEnabled()) {
    return { deleted: 0 };
  }
  const key = storageKey(kind, name);
  const bucket = openBucket(BUCKET);
  if (!bucket) {
    return { deleted: 0 };
  }
  const docs = await findLatest(bucket, key);
  for (const doc of docs) {
    await bucket.delete(doc._id);
  }
  cacheDrop(key);
  cacheSet(key, null);
  return { deleted: docs.length };
}

function kindRoot(kind) {
  assertKind(kind);
  if (rootOverride) {
    return kind === 'photos' ? rootOverride.photos : rootOverride.images;
  }
  return kind === 'photos' ? PHOTOS_DIR : IMAGES_DIR;
}

function localPathFor(kind, name) {
  const safeName = safeRelativeName(name);
  const root = path.resolve(kindRoot(kind));
  const full = path.resolve(root, ...safeName.split('/'));
  const relative = path.relative(root, full);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    const error = new Error('invalid upload name');
    error.code = 'invalid_name';
    throw error;
  }
  return full;
}

async function fileMatchesMeta(filePath, meta) {
  if (!meta || !fs.existsSync(filePath)) {
    return false;
  }
  const stat = await fs.promises.stat(filePath);
  if (!stat.isFile() || stat.size !== meta.size) {
    return false;
  }
  if (!meta.sha256) {
    return true;
  }
  const digest = sha256(await fs.promises.readFile(filePath));
  return digest === meta.sha256;
}

async function ensureLocalCopy(kind, name) {
  const full = localPathFor(kind, name);
  if (!isImageStoreEnabled()) {
    return fs.existsSync(full) ? full : null;
  }
  const meta = await getMeta(kind, name);
  if (!meta) {
    return fs.existsSync(full) ? full : null;
  }
  if (await fileMatchesMeta(full, meta)) {
    return full;
  }
  const bucket = openBucket(BUCKET);
  if (!bucket) {
    return fs.existsSync(full) ? full : null;
  }
  await fs.promises.mkdir(path.dirname(full), { recursive: true });
  const tmp = path.join(
    path.dirname(full),
    `.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`,
  );
  try {
    await pipeline(bucket.openDownloadStream(meta.id), fs.createWriteStream(tmp));
    const written = sha256(await fs.promises.readFile(tmp));
    if (meta.sha256 && written !== meta.sha256) {
      const error = new Error('downloaded upload hash mismatch');
      error.code = 'hash_mismatch';
      throw error;
    }
    if (fs.existsSync(full)) {
      await fs.promises.unlink(full);
    }
    await fs.promises.rename(tmp, full);
    return full;
  } catch (err) {
    await fs.promises.unlink(tmp).catch(() => {});
    throw err;
  }
}

function classifyLocalPath(absPath) {
  const resolved = path.resolve(String(absPath || ''));
  const cacheRoot = path.resolve(PHOTO_CACHE_DIR);
  if (resolved === cacheRoot || resolved.startsWith(`${cacheRoot}${path.sep}`)) {
    return null;
  }
  const roots = rootOverride
    ? [['photos', rootOverride.photos], ['images', rootOverride.images]]
    : [['photos', PHOTOS_DIR], ['images', IMAGES_DIR]];
  for (const [kind, root] of roots) {
    const base = path.resolve(root);
    const relative = path.relative(base, resolved);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
      continue;
    }
    const name = relative.split(path.sep).join('/');
    if (name.split('/').includes('onboarding-pending') || name.split('/').includes('.photo-cache')) {
      return null;
    }
    return { kind, name };
  }
  return null;
}

async function rememberLocalFile(absPath) {
  if (!isImageStoreEnabled()) {
    return;
  }
  const classified = classifyLocalPath(absPath);
  if (!classified) {
    return;
  }
  try {
    await putFileUnchecked(classified.kind, classified.name, absPath);
  } catch (err) {
    logStoreError(err);
  }
}

async function rememberNamedFile(kind, name, absPath) {
  if (!isImageStoreEnabled()) {
    return;
  }
  try {
    await putFileUnchecked(kind, path.posix.basename(String(name || '')), absPath);
  } catch (err) {
    logStoreError(err);
  }
}

async function forgetLocalFile(absPath) {
  if (!isImageStoreEnabled()) {
    return;
  }
  const classified = classifyLocalPath(absPath);
  if (!classified) {
    return;
  }
  try {
    await deleteFile(classified.kind, classified.name);
  } catch (err) {
    logStoreError(err);
  }
}

async function forgetNamedFile(kind, name) {
  if (!isImageStoreEnabled()) {
    return;
  }
  try {
    await deleteFile(kind, name);
  } catch (err) {
    logStoreError(err);
  }
}

module.exports = {
  BUCKET,
  BACKUP_BUCKET,
  CACHE_MS,
  isImageStoreEnabled,
  safeRelativeName,
  storageKey,
  sha256,
  putFile,
  putFileUnchecked,
  getMeta,
  openStream,
  deleteFile,
  ensureLocalCopy,
  rememberLocalFile,
  rememberNamedFile,
  forgetLocalFile,
  forgetNamedFile,
  localPathFor,
  classifyLocalPath,
  openBucket,
  getDb,
  findLatest,
  metaFromDoc,
  contentTypeFor,
  useImageStoreBackend,
  setStorageRootsForTests,
  resetImageStoreForTests,
  setNowForTests,
  logStoreError,
};
