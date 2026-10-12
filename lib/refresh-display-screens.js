const Synagogue = require('../models/Synagogue');
const { invalidateBoardCache } = require('./board-cache');
const { nextPublishedVersion } = require('./board-publish');
const { currentCodeVersion } = require('./changelog');

async function refreshCommunityDisplayScreens(slug) {
  const synagogue = await Synagogue.findOne({ slug }, { publishedVersion: 1 }).lean();
  if (!synagogue) {
    return null;
  }

  const publishedVersion = nextPublishedVersion(synagogue.publishedVersion);
  await Synagogue.updateOne(
    { slug },
    { $set: { publishedVersion, publishedAt: new Date(), lastRefreshedCodeVersion: currentCodeVersion() } },
  );
  invalidateBoardCache(slug);
  return { publishedVersion };
}

module.exports = {
  refreshCommunityDisplayScreens,
};
