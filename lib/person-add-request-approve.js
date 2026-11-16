/**
 * 1.41.0: turning an approved add-person request into a board person uses the same three normalized
 * name parts as the admin and public forms: surname, givenName (given-name words only) and
 * parentName + parentRelation (the בן/בת marker, from the male/female choice).
 * Legacy requests that only stored `deceasedName` still work — the name is used as the given name.
 */
const { normalizeGender } = require('./deceased-gender');
const { computeHebrewDateOfDeath } = require('./person-hebrew-death');
const {
  composeAdminName,
  removeSurnameFromName,
  normalizeParentRelation,
  hasLegacyMarker,
} = require('./person-name');

/** 'male' unless the request says female (older behaviour, kept for callers of this module). */
function normalizeDeceasedGender(raw) {
  return normalizeGender(raw) === 'female' ? 'female' : 'male';
}

/** Public submissions store «Surname» and «Given name» separately; the board name has both. */
function splitSubmittedName(request) {
  const source = request || {};
  const fullName = String(source.deceasedName || '').trim();
  const surname = String(source.deceasedSurname || '').trim();
  const given = String(source.deceasedGivenName || '').trim();
  if (!surname) {
    return { surname: '', givenName: given || fullName };
  }
  if (given) {
    return { surname, givenName: given };
  }
  // Older requests only stored the combined display name: strip the known surname off it.
  const stripped = removeSurnameFromName(fullName, surname);
  return { surname, givenName: stripped || fullName };
}

/** The parent name + marker carried by the request (deceasedParentName, legacy deceasedFatherName). */
function readSubmittedParent(request) {
  const source = request || {};
  const parentName = String(source.deceasedParentName || source.deceasedFatherName || '').trim();
  const relation = normalizeParentRelation(
    source.deceasedParentRelation || source.parentRelation
      || (source.deceasedGender === 'female' ? 'bat' : ''),
  );
  return { parentName, relation };
}

/**
 * @param {object} request normalized person-add request
 * @param {string} lang community language
 *   `name` is the canonical stored name (surname-first) — the board composes its own display name
 *   from the saved parts by the community's name order.
 */
function buildPersonFromAddRequest(request, lang) {
  const source = request || {};
  const gender = normalizeDeceasedGender(source.deceasedGender);
  const { surname, givenName } = splitSubmittedName(source);
  const { parentName, relation } = readSubmittedParent(source);

  // A legacy given name that already carries its בן/בת part is never given a second marker.
  const parentPart = parentName && !hasLegacyMarker(givenName)
    ? { parentName, parentRelation: relation || (gender === 'female' ? 'bat' : 'ben') }
    : { parentName: '', parentRelation: '' };

  const person = {
    name: composeAdminName({ surname, givenName, ...parentPart, gender }, lang),
    surname,
    givenName,
    ...parentPart,
    photo: source.photo || '',
    photoCrop: source.photoCrop,
    title: '',
    text: '',
    internalNotes: source.deceasedNotes || '',
    diedAfterSunset: source.diedAfterSunset === true,
    gregorianDateOfDeath: source.gregorianDateOfDeath,
  };

  if (person.gregorianDateOfDeath) {
    const hebrew = computeHebrewDateOfDeath(person.gregorianDateOfDeath, {
      diedAfterSunset: person.diedAfterSunset,
    });
    if (hebrew) {
      person.hebrewDateOfDeath = hebrew;
    }
  }

  if (source.submitter) {
    person.contact = source.submitter;
    person.contacts = [source.submitter];
  }

  return person;
}

module.exports = {
  normalizeDeceasedGender,
  splitSubmittedName,
  buildPersonFromAddRequest,
};
