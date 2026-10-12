const path = require('path');
const fs = require('fs');

const CHANGELOG_PATH = path.join(__dirname, '..', 'CHANGELOG.json');
const TYPES = new Set(['added', 'fixed', 'changed']);

function parseVersion(value) {
  const parts = String(value || '').trim().split('.').map((p) => Number.parseInt(p, 10));
  if (!parts.length || parts.some((p) => !Number.isFinite(p) || p < 0)) return null;
  while (parts.length < 3) parts.push(0);
  return parts;
}

function compareVersions(a, b) {
  const pa = parseVersion(a) || [0, 0, 0];
  const pb = parseVersion(b) || [0, 0, 0];
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

function normalizeChangelog(raw) {
  return (Array.isArray(raw) ? raw : [])
    .filter((e) => e && parseVersion(e.version))
    .map((e) => ({
      version: String(e.version),
      date: String(e.date || ''),
      items: (Array.isArray(e.items) ? e.items : [])
        .filter((i) => i && i.text)
        .map((i) => ({ type: TYPES.has(i.type) ? i.type : 'changed', text: String(i.text) })),
    }))
    .sort((a, b) => compareVersions(b.version, a.version));
}

let cached = null;
function loadChangelog() {
  if (!cached) {
    try {
      cached = normalizeChangelog(JSON.parse(fs.readFileSync(CHANGELOG_PATH, 'utf8')));
    } catch (err) {
      cached = [];
    }
  }
  return cached;
}

function currentCodeVersion(changelog = loadChangelog()) {
  return changelog.length ? changelog[0].version : '0.0.0';
}

function hasUnseenRelease(lastRefreshedCodeVersion, codeVersion = currentCodeVersion()) {
  if (!lastRefreshedCodeVersion) return compareVersions(codeVersion, '0.0.0') > 0;
  return compareVersions(codeVersion, lastRefreshedCodeVersion) > 0;
}

module.exports = {
  CHANGELOG_PATH,
  parseVersion,
  compareVersions,
  normalizeChangelog,
  loadChangelog,
  currentCodeVersion,
  hasUnseenRelease,
};
