function parsePeopleListSearchParam(raw) {
  if (raw == null || raw === '') {
    return '';
  }
  const text = String(raw).trim();
  if (!text) {
    return '';
  }
  try {
    return decodeURIComponent(text.replace(/\+/g, ' ')).trim();
  } catch {
    return text;
  }
}

function personMatchesPeopleSearch(personName, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) {
    return true;
  }
  return String(personName || '').toLowerCase().includes(q);
}

function appendPeopleListQuery(baseUrl, query) {
  const q = String(query || '').trim();
  if (!q) {
    return baseUrl;
  }
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}q=${encodeURIComponent(q)}`;
}

function buildWeeklyKaddishPeopleHref(slug, encodedNameQuery) {
  const safeSlug = String(slug || '').trim();
  const q = String(encodedNameQuery || '').trim();
  if (!safeSlug || !q) {
    return '';
  }
  return `/admin/${safeSlug}/people?q=${q}`;
}

module.exports = {
  parsePeopleListSearchParam,
  personMatchesPeopleSearch,
  appendPeopleListQuery,
  buildWeeklyKaddishPeopleHref,
};
