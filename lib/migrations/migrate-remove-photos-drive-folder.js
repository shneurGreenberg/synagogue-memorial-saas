const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');
const {
  indexImagesRecursive,
  mergeImageIndexes,
  copyReferencedPhotosForPeople,
} = require('../yizkor-photos');
const { PHOTOS_DIR } = require('../storage-paths');
const { PROVISIONING_DIR } = require('../master-provisioning');

const MIGRATION_ID = 'remove-photos-drive-folder-v1';

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function pathFromFileUrl(value) {
  const raw = String(value || '').trim();
  if (!raw.toLowerCase().startsWith('file:')) {
    return null;
  }
  try {
    const parsed = fileURLToPath(raw);
    return fs.existsSync(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function pathIfLocalDirectory(value) {
  const raw = String(value || '').trim();
  if (!raw || isHttpUrl(raw)) {
    return null;
  }

  const fromFile = pathFromFileUrl(raw);
  if (fromFile && fs.statSync(fromFile).isDirectory()) {
    return fromFile;
  }

  const resolved = path.resolve(raw);
  if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
    return resolved;
  }

  return null;
}

/**
 * Resolve local image folders for a community (Drive URLs are not imported here).
 */
function resolveLocalPhotoFolders(photosDriveUrl, slug, provisioningDir = PROVISIONING_DIR) {
  const folders = [];
  const seen = new Set();

  function add(dir) {
    if (!dir || seen.has(dir)) {
      return;
    }
    seen.add(dir);
    folders.push(dir);
  }

  add(pathIfLocalDirectory(photosDriveUrl));

  if (slug) {
    add(pathIfLocalDirectory(path.join(provisioningDir, slug, 'photos')));
    add(pathIfLocalDirectory(path.join(provisioningDir, slug)));
  }

  return folders;
}

function peopleMissingPhotoFiles(people, photosDir = PHOTOS_DIR) {
  const list = [];
  for (const person of people || []) {
    const photo = person.photo && String(person.photo).trim();
    if (!photo) {
      continue;
    }
    const dest = path.join(photosDir, path.basename(photo));
    if (!fs.existsSync(dest)) {
      list.push(person);
    }
  }
  return list;
}

/**
 * Copy referenced person photos from local folders into standard photo storage.
 * @returns {{ success: boolean, copied: number, missing: string[], hadLocalFolder: boolean }}
 */
function importLocalFolderPhotosForSynagogue(synagogue, options = {}) {
  const photosDriveUrl = synagogue?.provisioning?.photosDriveUrl || '';
  const slug = synagogue?.slug || '';
  const provisioningDir = options.provisioningDir || PROVISIONING_DIR;
  const photosDir = options.photosDir || PHOTOS_DIR;

  if (!String(photosDriveUrl).trim()) {
    return { success: true, copied: 0, missing: [], hadLocalFolder: false, skipped: true };
  }

  const folders = resolveLocalPhotoFolders(photosDriveUrl, slug, provisioningDir);
  const hadLocalFolder = folders.length > 0;
  const needing = peopleMissingPhotoFiles(synagogue.people, photosDir);

  if (!hadLocalFolder) {
    return { success: true, copied: 0, missing: [], hadLocalFolder: false };
  }

  if (!needing.length) {
    return { success: true, copied: 0, missing: [], hadLocalFolder: true };
  }

  if (!fs.existsSync(photosDir)) {
    fs.mkdirSync(photosDir, { recursive: true });
  }

  const indexes = folders.map((dir) => indexImagesRecursive(dir));
  const index = mergeImageIndexes(...indexes);
  const result = copyReferencedPhotosForPeople(index, needing, photosDir);

  return {
    success: result.missing.length === 0,
    copied: result.copied,
    missing: result.missing,
    hadLocalFolder: true,
  };
}

async function migrateRemovePhotosDriveFolder(Synagogue) {
  const query = {
    'provisioning.photosDriveUrl': { $exists: true, $nin: ['', null] },
  };

  const synagogues = await Synagogue.find(query).lean();
  let unsetCount = 0;
  let importCount = 0;
  let keptCount = 0;

  for (const doc of synagogues) {
    const outcome = importLocalFolderPhotosForSynagogue(doc);
    if (!outcome.success) {
      keptCount += 1;
      console.warn(
        `[migration ${MIGRATION_ID}] ${doc.slug}: kept photosDriveUrl — `
        + `${outcome.missing.length} photo file(s) missing in local folder`,
      );
      continue;
    }

    await Synagogue.updateOne(
      { _id: doc._id },
      { $unset: { 'provisioning.photosDriveUrl': '' } },
    );
    unsetCount += 1;
    if (outcome.copied > 0) {
      importCount += 1;
      console.log(
        `[migration ${MIGRATION_ID}] ${doc.slug}: imported ${outcome.copied} photo(s)`,
      );
    }
  }

  return { unsetCount, importCount, keptCount, scanned: synagogues.length };
}

module.exports = {
  MIGRATION_ID,
  resolveLocalPhotoFolders,
  pathIfLocalDirectory,
  peopleMissingPhotoFiles,
  importLocalFolderPhotosForSynagogue,
  migrateRemovePhotosDriveFolder,
};
