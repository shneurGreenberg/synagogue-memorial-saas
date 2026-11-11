/**
 * 1.36.0 I67: admin "add deceased" works like the public add-name form: the deceased's name and the
 * father's name are typed separately and בן/בת (бен/бат, ben/bat) is added from the male/female
 * choice. Reuses the public form's builder (lib/deceased-board-name.js).
 */
const { buildDeceasedBoardName, stripLeadingGenderPrefix } = require('./deceased-board-name');
const { normalizeGender, inferGenderFromName } = require('./deceased-gender');

/**
 * @returns {{ name: string, gender: 'male'|'female'|'' }} gender is what the prefix was built
 *   with ('' when no father's name was given, so nothing was added).
 */
function buildDeceasedBoardNameFromAdminForm(body = {}, communityLanguage = 'ru') {
  const rawName = String(body.name || '').trim().slice(0, 200);
  const father = String(body.fatherName || '').trim().slice(0, 120);
  if (!father) {
    return { name: rawName, gender: '' };
  }
  const chosen = normalizeGender(body.gender);
  const inferred = inferGenderFromName(rawName);
  const gender = chosen !== 'unknown' ? chosen : (inferred === 'female' ? 'female' : 'male');
  const lang = ['he', 'ru', 'en'].includes(communityLanguage) ? communityLanguage : 'ru';
  const name = buildDeceasedBoardName({
    deceasedName: stripLeadingGenderPrefix(rawName),
    fatherName: father,
    gender,
    lang,
  });
  return { name: name || rawName, gender };
}

module.exports = { buildDeceasedBoardNameFromAdminForm };
