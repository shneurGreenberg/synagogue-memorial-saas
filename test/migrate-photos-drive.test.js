const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  resolveLocalPhotoFolders,
  peopleMissingPhotoFiles,
  importLocalFolderPhotosForSynagogue,
} = require('../lib/migrations/migrate-remove-photos-drive-folder');
const { indexImagesRecursive } = require('../lib/yizkor-photos');

function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'photos-migrate-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('resolveLocalPhotoFolders ignores http Drive URLs', () => {
  const folders = resolveLocalPhotoFolders('https://drive.google.com/drive/folders/abc', 'demo', '/tmp');
  assert.deepStrictEqual(folders, []);
});

test('resolveLocalPhotoFolders finds provisioning slug directory', () => {
  withTempDir((root) => {
    const slugDir = path.join(root, 'tomsk', 'photos');
    fs.mkdirSync(slugDir, { recursive: true });
    const folders = resolveLocalPhotoFolders('', 'tomsk', root);
    assert.ok(folders.includes(slugDir));
  });
});

test('importLocalFolderPhotosForSynagogue copies missing files then can unset', () => {
  withTempDir((root) => {
    const photosDir = path.join(root, 'photos');
    const sourceDir = path.join(root, 'prov', 'demo', 'photos');
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.mkdirSync(photosDir, { recursive: true });
    fs.writeFileSync(path.join(sourceDir, '1-test.jpg'), 'fake-image');

    const synagogue = {
      slug: 'demo',
      provisioning: { photosDriveUrl: 'https://drive.google.com/example' },
      people: [{ id: 1, name: 'Test Person', photo: '1-test.jpg' }],
    };

    const first = importLocalFolderPhotosForSynagogue(synagogue, {
      provisioningDir: path.join(root, 'prov'),
      photosDir,
    });
    assert.strictEqual(first.success, true);
    assert.strictEqual(first.copied, 1);
    assert.ok(fs.existsSync(path.join(photosDir, '1-test.jpg')));

    const second = importLocalFolderPhotosForSynagogue(synagogue, {
      provisioningDir: path.join(root, 'prov'),
      photosDir,
    });
    assert.strictEqual(second.success, true);
    assert.strictEqual(second.copied, 0);
  });
});

test('importLocalFolderPhotosForSynagogue fails when local files cannot be resolved', () => {
  withTempDir((root) => {
    const photosDir = path.join(root, 'photos');
    const sourceDir = path.join(root, 'prov', 'demo');
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.mkdirSync(photosDir, { recursive: true });

    const synagogue = {
      slug: 'demo',
      provisioning: { photosDriveUrl: sourceDir },
      people: [{ id: 2, name: 'Missing', photo: '2-nope.jpg' }],
    };

    const result = importLocalFolderPhotosForSynagogue(synagogue, {
      provisioningDir: path.join(root, 'prov'),
      photosDir,
    });
    assert.strictEqual(result.success, false);
    assert.ok(result.missing.includes('2-nope.jpg'));
  });
});

test('peopleMissingPhotoFiles only lists people without files on disk', () => {
  withTempDir((photosDir) => {
    fs.mkdirSync(photosDir, { recursive: true });
    fs.writeFileSync(path.join(photosDir, 'exists.jpg'), 'x');
    const missing = peopleMissingPhotoFiles([
      { id: 1, photo: 'exists.jpg' },
      { id: 2, photo: 'gone.jpg' },
    ], photosDir);
    assert.strictEqual(missing.length, 1);
    assert.strictEqual(missing[0].id, 2);
  });
});

test('indexImagesRecursive finds nested images', () => {
  withTempDir((root) => {
    const nested = path.join(root, 'a', 'b');
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(path.join(nested, 'pic.png'), 'png');
    const index = indexImagesRecursive(root);
    assert.ok(index.has('pic.png'));
  });
});
