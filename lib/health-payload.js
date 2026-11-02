const { currentCodeVersion } = require('./changelog');

const MONGO_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

function buildHealthPayload(opts = {}) {
  const extra = opts.mongo === undefined ? {} : { mongo: MONGO_STATES[opts.mongo] || 'unknown' };
  return {
    ok: true,
    ...extra,
    node: process.version,
    version: currentCodeVersion(),
  };
}

module.exports = { buildHealthPayload };
