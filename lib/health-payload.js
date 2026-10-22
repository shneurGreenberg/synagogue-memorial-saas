const { currentCodeVersion } = require('./changelog');

function buildHealthPayload() {
  return {
    ok: true,
    node: process.version,
    version: currentCodeVersion(),
  };
}

module.exports = { buildHealthPayload };
