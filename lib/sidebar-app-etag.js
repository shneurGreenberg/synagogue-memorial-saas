const crypto = require('crypto');

function computeSidebarAppEtag(payload) {
  if (!payload || typeof payload !== 'object') {
    return '';
  }
  const { updatedAt, ...stable } = payload;
  const json = JSON.stringify(stable);
  return crypto.createHash('sha256').update(json).digest('hex').slice(0, 16);
}

module.exports = {
  computeSidebarAppEtag,
};
