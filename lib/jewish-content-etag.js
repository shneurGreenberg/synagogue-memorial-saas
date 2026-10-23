const crypto = require('crypto');

function computeJewishContentEtag(feed) {
  if (!feed || typeof feed !== 'object') {
    return '';
  }
  const json = JSON.stringify(feed);
  return crypto.createHash('sha256').update(json).digest('hex').slice(0, 16);
}

module.exports = {
  computeJewishContentEtag,
};
