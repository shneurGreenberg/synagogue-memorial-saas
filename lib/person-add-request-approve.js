const { buildDeceasedBoardName, stripLeadingGenderPrefix } = require('./deceased-board-name');
const { computeHebrewDateOfDeath } = require('./person-hebrew-death');
const { composePersonName, removeSurnameFromName } = require('./person-name');

function normalizeDeceasedGender(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'female' || value === 'bat' || value === 'f') {
    return 'female';
  }
  if (value === 'male' || value === 'ben' || value === 'm') {
    return 'male';
  }
  return 'male';
}

/** Public submissions store «Surname» and «First name» separately; the board name has both. */
function splitSubmittedName(request) {
  const fullName = String(request.deceasedName || '').trim();
  const surname = String(request.deceasedSurname || '').trim();
  const given = String(request.deceasedGivenName || '').trim();
  if (!surname) {
    return { surname: '', givenName: fullName };
  }
  if (given) {
    return { surname, givenName: given };
  }
  // Older requests only stored the combined display name: strip the known surname off it.
  const stripped = removeSurnameFromName(fullName, surname);
  return { surname, givenName: stripped || fullName };
}

/**
 * @param {object} request normalized person-add request
 * @param {string} lang community language
 * @param {'surname-first'|'given-first'} [order] community name order for the composed name
 */
function buildPersonFromAddRequest(request, lang, order = 'surname-first') {
  const gender = normalizeDeceasedGender(request.deceasedGender);
  const { surname, givenName: submittedGivenName } = splitSubmittedName(request);
  const givenName = buildDeceasedBoardName({
    deceasedName: stripLeadingGenderPrefix(submittedGivenName),
    fatherName: request.deceasedFatherName,
    gender,
    lang,
  }) || submittedGivenName;

  const person = {
    name: surname
      ? composePersonName({ surname, givenName, name: request.deceasedName }, order)
      : givenName,
    surname,
    givenName: surname ? givenName : '',
    photo: request.photo || '',
    photoCrop: request.photoCrop,
    title: '',
    text: '',
    internalNotes: request.deceasedNotes || '',
    diedAfterSunset: request.diedAfterSunset === true,
    gregorianDateOfDeath: request.gregorianDateOfDeath,
  };

  if (person.gregorianDateOfDeath) {
    const hebrew = computeHebrewDateOfDeath(person.gregorianDateOfDeath, {
      diedAfterSunset: person.diedAfterSunset,
    });
    if (hebrew) {
      person.hebrewDateOfDeath = hebrew;
    }
  }

  if (request.submitter) {
    person.contact = request.submitter;
    person.contacts = [request.submitter];
  }

  return person;
}

module.exports = {
  normalizeDeceasedGender,
  buildPersonFromAddRequest,
  splitSubmittedName,
};
