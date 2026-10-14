const { pickDesignFromSnapshot } = require('./saved-view-design');

function stripCommunityBrandingFromSnapshot(snapshot) {
  return pickDesignFromSnapshot(snapshot);
}

module.exports = {
  stripCommunityBrandingFromSnapshot,
};
