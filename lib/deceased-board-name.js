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

// 1.36.0 I64/I67: the board uses the Hebrew words everywhere — בן/בת in Hebrew script,
// бен/бат in Russian, ben/bat in Latin script (instead of сын/дочь, son/daughter).
const PREFIXES = {
  he: { male: 'בן', female: 'בת' },
  ru: { male: 'бен', female: 'бат' },
  en: { male: 'ben', female: 'bat' },
};

/** Script of a name: 'he' (Hebrew letters), 'ru' (Cyrillic), 'en' (Latin) or '' (none). */
function detectNameScript(text) {
  const value = String(text || '');
  const he = (value.match(/[\u05D0-\u05EA]/g) || []).length;
  const ru = (value.match(/[\u0400-\u04FF]/g) || []).length;
  const en = (value.match(/[A-Za-z]/g) || []).length;
  const max = Math.max(he, ru, en);
  if (!max) return '';
  if (he === max) return 'he';
  if (ru === max) return 'ru';
  return 'en';
}

function genderPrefix(gender, lang) {
  const safeLang = ['he', 'ru', 'en'].includes(lang) ? lang : 'ru';
  return PREFIXES[safeLang][gender === 'female' ? 'female' : 'male'];
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
  // The words follow the script the name is written in; the community language is the fallback.
  const script = detectNameScript(`${name} ${father}`) || lang;
  const prefix = genderPrefix(gender, script);
  return `${name} ${prefix} ${father}`;
}

module.exports = {
  GENDER_PREFIXES,
  stripLeadingGenderPrefix,
  genderPrefix,
  detectNameScript,
  PREFIXES,
  buildDeceasedBoardName,
};
