/**
 * 1.40.0 I88: propose splitting a stored display name («Иванов Иван бен Александр») into a
 * separate surname + givenName without touching the stored `name`.
 *
 * A split is proposed only when it is safe:
 *   - the community convention is known (surname-first / given-first),
 *   - the surname token sits where that convention puts it (before בן/בת),
 *   - that token has Russian surname morphology and the other given-name token does not,
 *   - a clear given-name part remains, and
 *   - recomposing the split gives back the stored name byte for byte.
 * Anything else is reported with a short reason code and left untouched.
 */
const { PATRONYMIC_PREFIXES, composePersonName } = require('./person-name');

const CYRILLIC_RE = /[\u0400-\u04FF]/;
const HEBREW_RE = /[\u0590-\u05FF]/;

// Russian surname morphology, female forms first (they also match the male tails).
const FEMALE_SURNAME_ENDINGS = ['ова', 'ева', 'ёва', 'ина', 'ская', 'цкая'];
const MALE_SURNAME_ENDINGS = ['ов', 'ев', 'ёв', 'ин', 'ын', 'ский', 'цкий', 'ман', 'ер', 'ич', 'ко', 'ук', 'юк', 'ович'];

/** Short reason codes reported for every ambiguous row. */
const SPLIT_REASONS = [
  'empty-name',
  'order-unknown',
  'too-few-tokens',
  'no-surname-token',
  'no-given-name',
  'surname-shape',
  'given-shape',
  'hebrew-no-marker',
  'identity-mismatch',
];

function cleanToken(token) {
  return String(token == null ? '' : token).replace(/[(),.]/g, '').trim();
}

function isPatronymicPrefixToken(token) {
  return PATRONYMIC_PREFIXES.includes(cleanToken(token).toLowerCase());
}

function hasEnding(word, endings) {
  const lower = word.toLowerCase();
  return endings.some((ending) => lower.endsWith(ending));
}

/**
 * Russian surname morphology (-ов/-ев/-ёв/-ин/-ын/-ский/-цкий/-ман/-ер/-ич/-ко/-ук/-юк/-ович,
 * female -ова/-ева/-ина/-ская/-цкая). Hebrew and Latin tokens never match.
 */
function isRussianSurnameToken(token) {
  const word = cleanToken(token);
  if (!word || !CYRILLIC_RE.test(word) || isPatronymicPrefixToken(word)) {
    return false;
  }
  return hasEnding(word, FEMALE_SURNAME_ENDINGS) || hasEnding(word, MALE_SURNAME_ENDINGS);
}

/** Something plausible to keep as the given-name part (not a бен/бат marker, not a number). */
function looksLikeGivenName(token) {
  const word = cleanToken(token);
  if (!word || isPatronymicPrefixToken(word)) {
    return false;
  }
  return !/^\d+$/.test(word);
}

function withoutToken(tokens, index) {
  return tokens.filter((_, i) => i !== index).join(' ');
}

/**
 * @param {{name?: string, surname?: string, givenName?: string}} person
 * @param {'surname-first'|'given-first'|''} order the community convention.
 * @returns {{alreadySplit?: boolean, surname?: string, givenName?: string, reason?: string}}
 *   `reason` is '' for a confident split, otherwise one of SPLIT_REASONS.
 */
function proposeSurnameSplit(person, order) {
  const source = person || {};
  const rawName = String(source.name == null ? '' : source.name);
  const name = rawName.trim();
  const storedSurname = String(source.surname || '').trim();
  const storedGiven = String(source.givenName || '').trim();

  if (storedSurname || storedGiven) {
    return { alreadySplit: true, reason: '' };
  }
  if (!name) {
    return { reason: 'empty-name' };
  }
  if (order !== 'surname-first' && order !== 'given-first') {
    return { reason: 'order-unknown' };
  }

  const tokens = name.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) {
    return { reason: 'too-few-tokens' };
  }

  // The surname always sits before the בן/בת (бен/бат) marker.
  const markerIndex = tokens.findIndex((token, i) => i > 0 && isPatronymicPrefixToken(token));

  if (HEBREW_RE.test(name) && !CYRILLIC_RE.test(name)) {
    // Only split a Hebrew name when the part before בן/בת is clearly two or more tokens;
    // Hebrew has no surname morphology to lean on.
    if (markerIndex < 2) {
      return { reason: 'hebrew-no-marker' };
    }
    const surnameIndex = order === 'given-first' ? 1 : 0;
    const surname = cleanToken(tokens[surnameIndex]);
    const givenName = withoutToken(tokens, surnameIndex);
    if (!surname || !looksLikeGivenName(givenName)) {
      return { reason: 'no-given-name' };
    }
    if (composePersonName({ surname, givenName }, order) !== rawName) {
      return { reason: 'identity-mismatch' };
    }
    return { surname, givenName, reason: '' };
  }

  const head = markerIndex > 0 ? tokens.slice(0, markerIndex) : tokens;
  if (head.length < 2) {
    return { reason: 'no-given-name' };
  }

  const surnameIndex = order === 'given-first' ? 1 : 0;
  const givenIndex = 1 - surnameIndex;
  const surname = cleanToken(head[surnameIndex]);
  const givenToken = cleanToken(head[givenIndex]);

  if (!surname) {
    return { reason: 'no-surname-token' };
  }
  if (!isRussianSurnameToken(surname)) {
    return { reason: 'surname-shape' };
  }
  if (!looksLikeGivenName(givenToken)) {
    return { reason: 'no-given-name' };
  }
  if (isRussianSurnameToken(givenToken)) {
    return { reason: 'given-shape' };
  }

  const givenName = withoutToken(tokens, surnameIndex);
  if (composePersonName({ surname, givenName }, order) !== rawName) {
    return { reason: 'identity-mismatch' };
  }
  return { surname, givenName, reason: '' };
}

module.exports = {
  SPLIT_REASONS,
  isRussianSurnameToken,
  isPatronymicPrefixToken,
  looksLikeGivenName,
  proposeSurnameSplit,
};
