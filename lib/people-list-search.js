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

/** Lowercase, drop () . , -, collapse spaces, ё→е and й→и. */
function normalizePeopleSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/й/g, 'и')
    .replace(/[().,\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function peopleSearchHaystack(person) {
  if (person && typeof person === 'object') {
    return normalizePeopleSearchText([
      person.name,
      person.surname,
      person.givenName,
      person.parentName,
    ].join(' '));
  }
  return normalizePeopleSearchText(person);
}

/**
 * Every word of the query must occur, in any order, in name + surname + givenName + parentName.
 * A plain string is still accepted (older callers that only had the display name).
 */
function personMatchesPeopleSearch(personOrName, query) {
  const q = normalizePeopleSearchText(query);
  if (!q) {
    return true;
  }
  const haystack = peopleSearchHaystack(personOrName);
  return q.split(' ').every((word) => haystack.includes(word));
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
  normalizePeopleSearchText,
  personMatchesPeopleSearch,
  appendPeopleListQuery,
  buildWeeklyKaddishPeopleHref,
};
