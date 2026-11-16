/**
 * 1.36.0 I67: admin "add deceased" works like the public add-name form: the deceased's name and the
 * parent's name are typed separately and בן/בת (бен/бат, ben/bat) is added from the male/female
 * choice. Reuses lib/deceased-board-name.js for the marker word.
 *
 * 1.40.0 I88: the form also has a separate Surname input.
 * 1.41.0: the form is made of three normalized parts — Surname / Given name / Parent name — plus
 * the male/female choice. givenName keeps ONLY the given-name words («Иван»), parentName the parent
 * («Александр») and parentRelation the marker ('ben' | 'bat'). The full name is only a read-only
 * preview; `name` is the canonical stored name (composeAdminName). A legacy given name that still
 * carries its בן/בת marker is kept as stored and never gets a second marker.
 */
const { stripLeadingGenderPrefix } = require('./deceased-board-name');
const { normalizeGender, inferGenderFromName } = require('./deceased-gender');
const {
  composeAdminName,
  removeSurnameFromName,
  normalizeParentRelation,
  PATRONYMIC_PREFIXES,
} = require('./person-name');
const { nominativeFatherField } = require('./nominative-name');

function cleanNamePart(value, maxLength = 200) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

/** The first field that was actually sent (an explicit '' counts, undefined does not). */
function pickField(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return '';
}

/** Does the name already carry its בן/בת part (legacy given names, or a pasted full name)? */
function hasPatronymicPart(name) {
  return String(name || '')
    .split(/\s+/)
    .some((token) => PATRONYMIC_PREFIXES.includes(token.toLowerCase()));
}

/**
 * The typed name may already repeat the surname («Иванов Иван», «Иван Иванов бен Александр»).
 * Remove one occurrence so `givenName` really is the name without the surname.
 */
function stripSurname(name, surname) {
  return removeSurnameFromName(name, surname);
}

/**
 * @param {object} body form fields: surname, givenName (legacy: name), parentName (legacy:
 *   fatherName), gender
 * @param {'ru'|'he'|'en'} communityLanguage
 * @returns {{ name: string, surname: string, givenName: string, parentName: string,
 *   parentRelation: 'ben'|'bat'|'', gender: 'male'|'female'|'' }}
 *   `name` is the canonical stored name (surname-first, composeAdminName) — the board composes its
 *   own display name from the parts by the community's name order.
 *   gender is what the marker was built with ('' when no parent name was given).
 */
function buildDeceasedBoardNameFromAdminForm(body = {}, communityLanguage = 'ru') {
  const source = body || {};
  const typedGiven = cleanNamePart(pickField(source.givenName, source.name));
  const surname = cleanNamePart(source.surname, 120);
  const typedParent = cleanNamePart(pickField(source.parentName, source.fatherName), 120);
  const lang = ['he', 'ru', 'en'].includes(communityLanguage) ? communityLanguage : 'ru';

  // The typed given name may itself contain the surname; givenName must not.
  const givenName = stripLeadingGenderPrefix(stripSurname(typedGiven, surname));
  const chosen = normalizeGender(source.gender);
  const inferred = inferGenderFromName(`${givenName || typedGiven} ${surname}`.trim());
  const resolvedGender = chosen !== 'unknown' ? chosen : (inferred === 'unknown' ? '' : inferred);

  if (!givenName) {
    return { name: surname || '', surname, givenName: '', parentName: '', parentRelation: '', gender: '' };
  }

  // A legacy given name that already carries its בן/בת part is kept exactly as typed.
  if (hasPatronymicPart(givenName)) {
    return {
      name: composeAdminName({ surname, givenName }, lang),
      surname,
      givenName,
      parentName: '',
      parentRelation: '',
      gender: resolvedGender,
    };
  }

  const parentName = typedParent ? nominativeFatherField(typedParent) : '';
  if (!parentName) {
    return {
      name: composeAdminName({ surname, givenName }, lang),
      surname,
      givenName,
      parentName: '',
      parentRelation: '',
      gender: '',
    };
  }

  const gender = resolvedGender || 'male';
  const parentRelation = normalizeParentRelation(gender === 'female' ? 'bat' : 'ben');
  return {
    name: composeAdminName({ surname, givenName, parentName, parentRelation, gender }, lang),
    surname,
    givenName,
    parentName,
    parentRelation,
    gender,
  };
}

/**
 * 1.41.0: the edit form must keep a legacy record byte-identical when its parts were not touched.
 * The three inputs are prefilled from the stored parts; an unsplit legacy person gets the stored full
 * name in the Given-name field, so "unchanged" there means exactly the same full name.
 *
 * @param {object} body submitted form fields
 * @param {object} person the stored person
 * @param {'ru'|'he'|'en'} communityLanguage
 * @returns {{ changed: boolean, name?: string, surname?: string, givenName?: string,
 *   parentName?: string, parentRelation?: string, gender?: string }}
 */
function resolveAdminNameParts(body = {}, person = {}, communityLanguage = 'ru') {
  const source = body || {};
  const stored = person || {};
  const storedName = String(stored.name || '').trim();
  const storedSurname = String(stored.surname || '').trim();
  const storedGiven = String(stored.givenName || '').trim();
  const storedParent = String(stored.parentName || '').trim();

  const typedGiven = cleanNamePart(pickField(source.givenName, source.name));
  const typedSurname = cleanNamePart(source.surname, 120);
  const typedParent = cleanNamePart(pickField(source.parentName, source.fatherName), 120);
  const chosenGender = normalizeGender(source.gender);
  const storedGender = stored.gender === 'male' || stored.gender === 'female' ? stored.gender : '';
  // A parent marker follows the gender choice, so changing it alone rewrites the name too.
  const relationChanged = !!storedParent && chosenGender !== 'unknown' && chosenGender !== storedGender;

  if (!relationChanged) {
    if (!storedGiven && !storedParent) {
      // Unsplit legacy person: the Given-name field carried the stored full name.
      if (typedGiven === storedName && typedSurname === storedSurname && !typedParent) {
        return { changed: false };
      }
    } else if (typedGiven === storedGiven && typedSurname === storedSurname && typedParent === storedParent) {
      return { changed: false };
    }
  }

  const built = buildDeceasedBoardNameFromAdminForm(
    { ...source, givenName: typedGiven, surname: typedSurname, parentName: typedParent },
    communityLanguage,
  );
  return { changed: true, ...built };
}

module.exports = {
  buildDeceasedBoardNameFromAdminForm,
  resolveAdminNameParts,
  cleanNamePart,
  pickField,
  stripSurname,
  hasPatronymicPart,
};
