/**
 * 1.36.0 I67: admin "add deceased" works like the public add-name form: the deceased's name and the
 * father's name are typed separately and בן/בת (бен/бат, ben/bat) is added from the male/female
 * choice. Reuses the public form's builder (lib/deceased-board-name.js).
 *
 * 1.40.0 I88: the form also has a separate Surname input. `givenName` is the name without the
 * surname (with its בן/בת parent part already added), `surname` is kept on its own and `name` is
 * the composed display string.
 */
const { buildDeceasedBoardName, stripLeadingGenderPrefix } = require('./deceased-board-name');
const { normalizeGender, inferGenderFromName } = require('./deceased-gender');
const { composePersonName, removeSurnameFromName, PATRONYMIC_PREFIXES } = require('./person-name');

function cleanNamePart(value, maxLength = 200) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

/** Does the name already carry its בן/בת part (e.g. when the edit form sends the full name)? */
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
 * @param {object} body form fields: name, surname, fatherName, gender
 * @param {'ru'|'he'|'en'} communityLanguage
 * @param {'surname-first'|'given-first'} order used only when the name is split
 * @returns {{ name: string, surname: string, givenName: string, gender: 'male'|'female'|'' }}
 *   gender is what the prefix was built with ('' when no father's name was given).
 */
function buildDeceasedBoardNameFromAdminForm(body = {}, communityLanguage = 'ru', order = 'surname-first') {
  const rawName = cleanNamePart(body.name);
  const surname = cleanNamePart(body.surname, 120);
  const father = cleanNamePart(body.fatherName, 120);
  const chosen = normalizeGender(body.gender);
  const inferred = inferGenderFromName(rawName);
  const gender = chosen !== 'unknown' ? chosen : (inferred === 'female' ? 'female' : 'male');
  const lang = ['he', 'ru', 'en'].includes(communityLanguage) ? communityLanguage : 'ru';
  // The typed name may itself contain the surname; givenName must not.
  const nameWithoutSurname = stripLeadingGenderPrefix(stripSurname(rawName, surname));

  if (!father) {
    // Without a parent name the name is kept as typed.
    if (!surname) {
      return { name: rawName, gender: '' };
    }
    const givenName = nameWithoutSurname || rawName || surname;
    return {
      name: composePersonName({ surname, givenName, name: rawName }, order),
      surname,
      givenName,
      gender: '',
    };
  }

  const givenName = nameWithoutSurname && hasPatronymicPart(nameWithoutSurname)
    ? nameWithoutSurname
    : buildDeceasedBoardName({
      deceasedName: nameWithoutSurname || rawName,
      fatherName: father,
      gender,
      lang,
    }) || rawName;

  if (!surname) {
    // Nothing to split — keep the legacy { name, gender } shape.
    return { name: givenName, gender };
  }

  return {
    name: composePersonName({ surname, givenName, name: rawName }, order),
    surname,
    givenName,
    gender,
  };
}

module.exports = { buildDeceasedBoardNameFromAdminForm, stripSurname, hasPatronymicPart };
