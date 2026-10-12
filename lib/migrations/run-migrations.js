const Synagogue = require('../../models/Synagogue');
const { migrateRemovePhotosDriveFolder } = require('./migrate-remove-photos-drive-folder');

async function runStartupMigrations() {
  try {
    const result = await migrateRemovePhotosDriveFolder(Synagogue);
    if (result.scanned > 0) {
      console.log(
        `Startup migration (photos folder): scanned ${result.scanned}, `
        + `unset ${result.unsetCount}, imported for ${result.importCount}, kept ${result.keptCount}`,
      );
    }
  } catch (err) {
    console.error('Startup migration (photos folder) failed:', err.message || err);
  }
}

module.exports = { runStartupMigrations };
