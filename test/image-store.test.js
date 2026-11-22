const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Writable, Readable } = require('stream');
const express = require('express');
const { ObjectId } = require('mongodb');

const imageStore = require('../lib/image-store');
const migration = require('../lib/migrations/migrate-uploads-to-db');
const { createSharedUploadMiddleware } = require('../lib/express-static-assets');
const { resolvePhotoPath } = require('../lib/photo-resize');

const previousImageStore = process.env.IMAGE_STORE;

function createMemoryGrid() {
  const buckets = new Map();
  function bucket(name) {
    if (!buckets.has(name)) {
      buckets.set(name, []);
    }
    const files = buckets.get(name);
    return {
      openUploadStream(filename, options = {}) {
        const id = new ObjectId();
        const chunks = [];
        const stream = new Writable({
          write(chunk, encoding, callback) {
            chunks.push(Buffer.from(chunk));
            callback();
          },
        });
        stream.id = id;
        stream.on('finish', () => {
          const buffer = Buffer.concat(chunks);
          files.push({
            _id: id,
            filename,
            length: buffer.length,
            uploadDate: new Date(),
            contentType: options.contentType,
            metadata: { ...(options.metadata || {}) },
            buffer,
          });
        });
        return stream;
      },
      openDownloadStream(id) {
        const doc = files.find((file) => String(file._id) === String(id));
        if (!doc) {
          const stream = new Readable({ read() {} });
          process.nextTick(() => stream.destroy(new Error('missing file')));
          return stream;
        }
        return Readable.from(doc.buffer);
      },
      find(query = {}) {
        const matched = files.filter((file) => !query.filename || file.filename === query.filename);
        return { toArray: async () => matched.map((file) => ({ ...file })) };
      },
      async delete(id) {
        const index = files.findIndex((file) => String(file._id) === String(id));
        if (index < 0) {
          throw new Error('file not found');
        }
        files.splice(index, 1);
      },
    };
  }

  const runs = [];
  const db = {
    async stats() {
      return { dataSize: 3 * 1024 * 1024, storageSize: 5 * 1024 * 1024, indexSize: 1024 * 1024 };
    },
    collection() {
      return {
        async insertOne(doc) {
          runs.push(doc);
          return { insertedId: runs.length };
        },
        async findOne(query) {
          return runs.find((run) => run.runId === query.runId) || null;
        },
      };
    },
  };
  return { bucket, db, runs, buckets };
}

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

async function get(server, urlPath) {
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}${urlPath}`);
  const body = Buffer.from(await response.arrayBuffer());
  return { status: response.status, body, headers: response.headers };
}

describe('image store', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'image-store-'));
  const images = path.join(root, 'images');
  const photos = path.join(root, 'photos');
  let memory;
  let calls;

  before(() => {
    fs.mkdirSync(images, { recursive: true });
    fs.mkdirSync(photos, { recursive: true });
    process.env.IMAGE_STORE = 'db';
    memory = createMemoryGrid();
    calls = { buckets: 0 };
    imageStore.useImageStoreBackend({
      db: memory.db,
      bucket(name) {
        calls.buckets += 1;
        return memory.bucket(name);
      },
    });
    imageStore.setStorageRootsForTests({ images, photos });
  });

  after(() => {
    imageStore.resetImageStoreForTests();
    if (previousImageStore === undefined) {
      delete process.env.IMAGE_STORE;
    } else {
      process.env.IMAGE_STORE = previousImageStore;
    }
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('puts, reads, replaces, and deletes a file', async () => {
    const first = await imageStore.putFile('images', 'logo.png', Buffer.from('aaa'));
    assert.equal(first.sha256, imageStore.sha256(Buffer.from('aaa')));
    const meta = await imageStore.getMeta('images', 'logo.png');
    assert.equal(meta.size, 3);
    assert.equal(meta.kind, 'images');
    assert.equal(meta.name, 'logo.png');
    assert.equal(meta.contentType, 'image/png');
    const replaced = await imageStore.putFile('images', 'logo.png', Buffer.from('bbbb'));
    assert.notEqual(String(replaced.id), String(first.id));
    const files = memory.buckets.get('uploads').filter((file) => file.filename === 'images/logo.png');
    assert.equal(files.length, 1);
    assert.equal(files[0].buffer.toString(), 'bbbb');
    const removed = await imageStore.deleteFile('images', 'logo.png');
    assert.equal(removed.deleted, 1);
    assert.equal(await imageStore.getMeta('images', 'logo.png'), null);
  });

  it('rejects path traversal', async () => {
    await assert.rejects(() => imageStore.putFile('photos', '../secret.png', Buffer.from('x')), /invalid upload name/);
    await assert.rejects(() => imageStore.putFile('photos', 'a/../../b.png', Buffer.from('x')), /invalid upload name/);
    await assert.rejects(() => imageStore.putFile('images', '/etc/passwd.png', Buffer.from('x')), /invalid upload name/);
  });

  it('refreshes a local copy when the hash differs', async () => {
    const local = path.join(photos, 'person.jpg');
    fs.writeFileSync(local, 'stale');
    await imageStore.putFile('photos', 'person.jpg', Buffer.from('fresh-bytes'));
    const copied = await imageStore.ensureLocalCopy('photos', 'person.jpg');
    assert.equal(copied, local);
    assert.equal(fs.readFileSync(local, 'utf8'), 'fresh-bytes');
  });

  it('does not call the database when IMAGE_STORE is unset', async () => {
    delete process.env.IMAGE_STORE;
    const before = calls.buckets;
    assert.deepEqual(await imageStore.putFile('images', 'x.png', Buffer.from('z')), { stored: false });
    assert.equal(await imageStore.getMeta('images', 'x.png'), null);
    assert.equal(await imageStore.openStream('images', 'x.png'), null);
    assert.deepEqual(await imageStore.deleteFile('images', 'x.png'), { deleted: 0 });
    assert.equal(calls.buckets, before);
    process.env.IMAGE_STORE = 'db';
  });

  it('serves the database file, then disk, then the bundled file', async () => {
    const disk = fs.mkdtempSync(path.join(os.tmpdir(), 'disk-'));
    const bundled = fs.mkdtempSync(path.join(os.tmpdir(), 'bundled-'));
    fs.writeFileSync(path.join(disk, 'on-disk.png'), 'from-disk');
    fs.writeFileSync(path.join(bundled, 'bundled.png'), 'from-bundle');
    await imageStore.putFile('images', 'from-db.png', Buffer.from('from-db'));
    const app = express();
    app.use('/images', createSharedUploadMiddleware('images', { maxAge: '7d' }));
    app.use('/images', express.static(disk));
    app.use('/images', express.static(bundled));
    const server = await listen(app);
    try {
      const fromDb = await get(server, '/images/from-db.png');
      assert.equal(fromDb.status, 200);
      assert.equal(fromDb.body.toString(), 'from-db');
      assert.match(fromDb.headers.get('cache-control'), /max-age=604800/);
      const fromDisk = await get(server, '/images/on-disk.png');
      assert.equal(fromDisk.body.toString(), 'from-disk');
      const fromBundle = await get(server, '/images/bundled.png');
      assert.equal(fromBundle.body.toString(), 'from-bundle');
      delete process.env.IMAGE_STORE;
      const bypass = await get(server, '/images/from-db.png');
      assert.equal(bypass.status, 404);
      process.env.IMAGE_STORE = 'db';
    } finally {
      server.close();
      fs.rmSync(disk, { recursive: true, force: true });
      fs.rmSync(bundled, { recursive: true, force: true });
    }
  });

  it('downloads the original before a resized photo is built', async () => {
    await imageStore.putFile('photos', 'resize-me.jpg', Buffer.from('original-photo'));
    const resolved = await resolvePhotoPath('resize-me.jpg');
    assert.equal(fs.readFileSync(resolved, 'utf8'), 'original-photo');
  });
});

describe('uploads migration', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'migrate-uploads-'));
  const imagesDir = path.join(root, 'images');
  const photosDir = path.join(root, 'photos');
  const bundledImagesDir = path.join(root, 'bundled-images');
  const bundledPhotosDir = path.join(root, 'bundled-photos');
  let memory;

  before(() => {
    fs.mkdirSync(imagesDir, { recursive: true });
    fs.mkdirSync(photosDir, { recursive: true });
    fs.mkdirSync(bundledImagesDir, { recursive: true });
    fs.mkdirSync(bundledPhotosDir, { recursive: true });
    fs.writeFileSync(path.join(imagesDir, 'keep.png'), 'same-bytes');
    fs.writeFileSync(path.join(bundledImagesDir, 'keep.png'), 'same-bytes');
    fs.writeFileSync(path.join(imagesDir, 'notes.txt'), 'not-an-image');
    fs.writeFileSync(path.join(imagesDir, '.tmp-upload.png'), 'temp');
    fs.mkdirSync(path.join(photosDir, '.photo-cache'), { recursive: true });
    fs.writeFileSync(path.join(photosDir, '.photo-cache', 'cached.jpg'), 'cached');
    fs.writeFileSync(path.join(photosDir, 'face.jpg'), 'face-v1');
    memory = createMemoryGrid();
    imageStore.useImageStoreBackend({ db: memory.db, bucket: memory.bucket });
  });

  after(() => {
    imageStore.resetImageStoreForTests();
    fs.rmSync(root, { recursive: true, force: true });
  });

  function options(extra = {}) {
    return {
      imagesDir,
      photosDir,
      bundledImagesDir,
      bundledPhotosDir,
      ...extra,
    };
  }

  it('dry-run writes nothing', async () => {
    const report = await migration.runUploadsMigration(options({ mode: 'dry-run' }));
    assert.equal(report.inserted, 0);
    assert.equal(report.skippedBundled >= 1, true);
    assert.equal(report.skippedNonImage >= 1, true);
    assert.equal(report.skippedTemp >= 1, true);
    assert.equal(report.bytes, Buffer.byteLength('face-v1'));
    assert.deepEqual(report.largest, [Buffer.byteLength('face-v1')]);
    assert.equal(report.db.dataSizeMB, 3);
    assert.equal(memory.runs.length, 0);
    assert.equal((memory.buckets.get('uploads') || []).length, 0);
  });

  it('apply is idempotent and restore removes what apply inserted', async () => {
    const first = await migration.runUploadsMigration(options({ mode: 'apply' }));
    assert.equal(first.inserted, 1);
    assert.equal(first.replaced, 0);
    assert.match(first.runId, /^up-/);
    const second = await migration.runUploadsMigration(options({ mode: 'apply' }));
    assert.equal(second.inserted, 0);
    assert.equal(second.alreadySame, 1);
    const restored = await migration.runUploadsMigration({ mode: 'restore', runId: first.runId });
    assert.equal(restored.removed, 1);
    assert.equal(memory.buckets.get('uploads').length, 0);
  });

  it('skips a conflict when the database file is newer and restores a replacement', async () => {
    fs.writeFileSync(path.join(photosDir, 'face.jpg'), 'face-v2');
    const past = new Date(Date.now() - 60 * 60 * 1000);
    fs.utimesSync(path.join(photosDir, 'face.jpg'), past, past);
    const existingId = new ObjectId();
    memory.buckets.get('uploads').push({
      _id: existingId,
      filename: 'photos/face.jpg',
      length: 7,
      uploadDate: new Date(Date.now() + 60 * 1000),
      metadata: {
        contentType: 'image/jpeg',
        size: 7,
        sha256: imageStore.sha256(Buffer.from('db-copy')),
        kind: 'photos',
        name: 'face.jpg',
      },
      buffer: Buffer.from('db-copy'),
    });
    const conflict = await migration.runUploadsMigration(options({ mode: 'apply' }));
    assert.equal(conflict.conflicts, 1);
    assert.equal(conflict.inserted, 0);
    assert.equal(conflict.replaced, 0);

    const future = new Date(Date.now() + 2 * 60 * 1000);
    fs.utimesSync(path.join(photosDir, 'face.jpg'), future, future);
    const applied = await migration.runUploadsMigration(options({ mode: 'apply' }));
    assert.equal(applied.replaced, 1);
    const current = memory.buckets.get('uploads').filter((file) => file.filename === 'photos/face.jpg');
    assert.equal(current.length, 1);
    assert.equal(current[0].buffer.toString(), 'face-v2');
    const backup = memory.buckets.get('uploads_backup');
    assert.equal(backup.length, 1);
    assert.equal(backup[0].buffer.toString(), 'db-copy');
    const undone = await migration.runUploadsMigration({ mode: 'restore', runId: applied.runId });
    assert.equal(undone.restored, 1);
    const after = memory.buckets.get('uploads').filter((file) => file.filename === 'photos/face.jpg');
    assert.equal(after.length, 1);
    assert.equal(after[0].buffer.toString(), 'db-copy');
  });
});

describe('uploads migration endpoint', () => {
  it('requires master auth and confirm for apply', async () => {
    const master = require('../routes/master');
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.session = req.get('x-test-master') === 'yes' ? { isMasterAdmin: true } : {};
      next();
    });
    app.use('/master', master);
    const server = await listen(app);
    try {
      const denied = await fetch(`http://127.0.0.1:${server.address().port}/master/api/uploads-migration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'apply', confirm: 'APPLY' }),
      });
      assert.equal(denied.status, 401);
      const unconfirmed = await fetch(`http://127.0.0.1:${server.address().port}/master/api/uploads-migration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-test-master': 'yes' },
        body: JSON.stringify({ mode: 'apply' }),
      });
      assert.equal(unconfirmed.status, 400);
      const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
      assert.match(appSource, /app\.use\('\/master', sessionMiddleware, requireSameOrigin, masterRoutes\)/);
    } finally {
      server.close();
    }
  });
});
