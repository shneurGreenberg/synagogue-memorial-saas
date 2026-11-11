/**
 * 1.36.0 I64: normalise the "son of / daughter of" word inside deceased names to the Hebrew words
 * the board uses: сын/дочь → бен/бат in Russian names, בן/בת in Hebrew names, ben/bat in Latin names
 * (also "son of" / "daughter of", "сын/дочь" written in any case). Deterministic rules only.
 */
const { detectNameScript, PREFIXES } = require('./deceased-board-name');
const { inferGenderFromName } = require('./deceased-gender');

// Marker word (as a whole word) → gender. Order matters: two-word forms first.
const MARKERS = [
  { re: /(^|[\s,(])(daughter\s+of)(?=\s)/i, gender: 'female' },
  { re: /(^|[\s,(])(son\s+of)(?=\s)/i, gender: 'male' },
  { re: /(^|[\s,(])(дочь|дочка)(?=\s)/i, gender: 'female' },
  { re: /(^|[\s,(])(сын)(?=\s)/i, gender: 'male' },
  { re: /(^|[\s,(])(daughter)(?=\s)/i, gender: 'female' },
  { re: /(^|[\s,(])(son)(?=\s)/i, gender: 'male' },
];
// Already-normalised words written with a capital in the middle of a name («Иван Бен Петр»).
const CASE_MARKERS = [
  { re: /(\S\s+)(Бен|БЕН)(?=\s+\S)/, word: 'бен', gender: 'male' },
  { re: /(\S\s+)(Бат|БАТ)(?=\s+\S)/, word: 'бат', gender: 'female' },
];

function normalizeGenderValue(g) {
  const v = String(g || '').toLowerCase();
  return v === 'male' || v === 'female' ? v : '';
}

/**
 * @returns {null | { name, newName, gender, newGender, rule, script, ambiguous, note }}
 *   null when nothing would change.
 */
function proposeBenBat(person = {}) {
  const name = String(person.name || '');
  if (!name.trim()) return null;
  const oldGender = normalizeGenderValue(person.gender);
  // The words follow the script of the name without the marker itself.
  let found = null;
  for (const m of MARKERS) {
    const match = m.re.exec(name);
    if (match) { found = { ...m, match }; break; }
  }
  let newName = name;
  let markerGender = '';
  let rule = '';
  let script = '';
  const notes = [];
  if (found) {
    const marker = found.match[2];
    const rest = name.replace(marker, ' ');
    script = detectNameScript(rest) || 'ru';
    const word = PREFIXES[script][found.gender];
    const start = found.match.index + found.match[1].length;
    newName = name.slice(0, start) + word + name.slice(start + marker.length);
    markerGender = found.gender;
    rule = `${marker.toLowerCase()}→${word}`;
    // A second marker in the same name ("сын … дочь …") needs a human look.
    const others = MARKERS.filter((m) => m !== MARKERS.find((x) => x.re === found.re))
      .some((m) => m.re.test(newName));
    if (others) notes.push('more than one son/daughter word');
    if (start === 0) notes.push('name starts with the son/daughter word');
  } else {
    for (const m of CASE_MARKERS) {
      const match = m.re.exec(name);
      if (match) {
        const start = match.index + match[1].length;
        newName = name.slice(0, start) + m.word + name.slice(start + match[2].length);
        markerGender = m.gender;
        rule = `${match[2]}→${m.word}`;
        script = 'ru';
        break;
      }
    }
  }
  newName = newName.replace(/\s{2,}/g, ' ').trim();
  // Whitespace-only differences are not a change worth writing.
  if (newName === name.replace(/\s{2,}/g, ' ').trim()) newName = name;
  let newGender = oldGender;
  if (!markerGender && !oldGender) {
    // No marker to fix: still propose a gender where the name makes it clear (בן/бен/patronymic…).
    const inferred = inferGenderFromName(newName);
    if (inferred === 'male' || inferred === 'female') {
      newGender = inferred;
      rule = rule || 'gender inferred from name';
    }
  }
  if (markerGender) {
    if (!oldGender) newGender = markerGender;
    else if (oldGender !== markerGender) notes.push(`gender on record is ${oldGender}, the name says ${markerGender}`);
  }
  if (newName === name && newGender === oldGender) return null;
  return {
    name,
    newName,
    gender: oldGender,
    newGender,
    rule: rule || 'gender only',
    script,
    ambiguous: notes.length > 0,
    note: notes.join('; '),
  };
}

module.exports = { proposeBenBat, MARKERS };
