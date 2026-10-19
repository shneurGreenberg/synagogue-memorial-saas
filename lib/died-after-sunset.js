function parseDiedAfterSunset(raw) {
  if (raw === true || raw === 1) {
    return true;
  }
  const value = String(raw == null ? '' : raw).trim().toLowerCase();
  if (!value || value === 'before' || value === '0' || value === 'false') {
    return false;
  }
  return value === 'after' || value === '1' || value === 'true' || value === 'on';
}

function advanceHebrewHDate(hdate) {
  if (!hdate || typeof hdate.next !== 'function') {
    return hdate;
  }
  return hdate.next();
}

module.exports = {
  parseDiedAfterSunset,
  advanceHebrewHDate,
};
