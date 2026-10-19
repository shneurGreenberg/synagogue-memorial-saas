const { buildDeceasedBoardName, stripLeadingGenderPrefix } = require('./deceased-board-name');
const { computeHebrewDateOfDeath } = require('./person-hebrew-death');

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

function buildPersonFromAddRequest(request, lang) {
  const gender = normalizeDeceasedGender(request.deceasedGender);
  const boardName = buildDeceasedBoardName({
    deceasedName: stripLeadingGenderPrefix(request.deceasedName),
    fatherName: request.deceasedFatherName,
    gender,
    lang,
  });

  const person = {
    name: boardName,
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
};
