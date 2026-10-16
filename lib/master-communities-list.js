const Synagogue = require('../models/Synagogue');

/**
 * Master dashboard fields only — never loads people[] or other heavy board blobs.
 */
async function loadMasterCommunitiesList() {
  const rows = await Synagogue.aggregate([
    { $sort: { name: 1 } },
    {
      $project: {
        _id: 1,
        slug: 1,
        name: 1,
        language: 1,
        adminLanguage: 1,
        weeklyKaddishReminderEnabled: 1,
        location: 1,
        theme: { logo: '$theme.logo' },
        boardClients: 1,
        publishedVersion: 1,
        publishedAt: 1,
        provisioning: {
          contactFiles: { $ifNull: ['$provisioning.contactFiles', []] },
        },
      },
    },
  ]);

  return rows;
}

module.exports = {
  loadMasterCommunitiesList,
};
