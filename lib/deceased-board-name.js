const GENDER_PREFIXES = [
  'בן',
  'בת',
  'сын',
  'дочь',
  'son',
  'daughter',
];

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripLeadingGenderPrefix(name) {
  let trimmed = String(name || '').trim();
  if (!trimmed) {
    return '';
  }

  for (const prefix of GENDER_PREFIXES) {
    const pattern = new RegExp(`^${escapeRegex(prefix)}\\s+`, 'i');
    if (pattern.test(trimmed)) {
      trimmed = trimmed.replace(pattern, '').trim();
      break;
    }
  }

  return trimmed;
}

function genderPrefix(gender, lang) {
  const safeLang = ['he', 'ru', 'en'].includes(lang) ? lang : 'ru';
  const isFemale = gender === 'female';
  if (safeLang === 'he') {
    return isFemale ? 'בת' : 'בן';
  }
  if (safeLang === 'en') {
    return isFemale ? 'daughter' : 'son';
  }
  return isFemale ? 'дочь' : 'сын';
}

function buildDeceasedBoardName({
  deceasedName,
  fatherName,
  gender,
  lang,
}) {
  const name = stripLeadingGenderPrefix(deceasedName);
  const father = String(fatherName || '').trim();
  if (!name) {
    return '';
  }
  if (!father) {
    return name;
  }
  const prefix = genderPrefix(gender, lang);
  return `${name} ${prefix} ${father}`;
}

module.exports = {
  GENDER_PREFIXES,
  stripLeadingGenderPrefix,
  genderPrefix,
  buildDeceasedBoardName,
};
