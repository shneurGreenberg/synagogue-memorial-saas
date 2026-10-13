function normalizeEtag(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }
  return raw.startsWith('"') ? raw : `"${raw}"`;
}

function ifNoneMatchSatisfied(req, etag) {
  const normalized = normalizeEtag(etag);
  if (!normalized) {
    return false;
  }
  const header = req.headers['if-none-match'];
  if (!header) {
    return false;
  }
  return header.split(',').map((part) => part.trim()).includes(normalized);
}

function sendJsonWithEtag(req, res, etag, body, { cacheControl = 'no-cache', status = 200 } = {}) {
  const normalized = normalizeEtag(etag);
  res.setHeader('Cache-Control', cacheControl);
  if (normalized) {
    res.setHeader('ETag', normalized);
  }
  if (ifNoneMatchSatisfied(req, normalized)) {
    return res.status(304).end();
  }
  return res.status(status).json(body);
}

module.exports = {
  normalizeEtag,
  ifNoneMatchSatisfied,
  sendJsonWithEtag,
};
