/**
 * 1.40.0 I88 / 1.40.1: propose splitting a stored display name («Иванов Иван бен Александр») into a
 * separate surname + givenName without touching the stored `name`.
 *
 * 1.40.1 replaced the "Russian surname morphology only" heuristic, which rejected many real surnames
 * (Кац, Сирота, Гинзбург, Коган…) and read given names as surnames (Яков, Лев, Нина, Валентина are
 * shaped like surnames). The decision is now structural, using the community itself as context:
 *   - the name must follow the known community convention,
 *   - it must look like «<A> <B> бен|бат <parent>…» (exactly two name tokens before the marker),
 *     or be a plain two-token name / a name + Russian patronymic,
 *   - both head tokens must be plain Cyrillic words (no brackets, initials, spaced dashes),
 *   - the surname token must not be a known given name or a token that this community uses as a
 *     given name (givenAtPos), and the given token must not look like a surname,
 *   - recomposing the split must give back the stored name (whitespace trimmed and collapsed).
 * Hebrew-script names are always ambiguous: they carry no Russian morphology and no fixed order.
 * Anything else is reported with a short reason code and left untouched.
 */
const { PATRONYMIC_PREFIXES, composePersonName } = require('./person-name');

const HEBREW_RE = /[\u0590-\u05FF]/;
const CYRILLIC_WORD_RE = /^[А-ЯЁа-яё]+(-[А-ЯЁа-яё]+)?$/;

// Given names that are also common surname shapes (or have no surname morphology at all).
const COMMON_GIVEN_NAMES = new Set([
  'лев', 'яков', 'нина', 'дина', 'фаина', 'валентина', 'валентин', 'антонина', 'капитолина',
  'екатерина', 'галина', 'ирина', 'марина', 'полина', 'регина', 'рина', 'мина', 'бина', 'цина',
  'вениамин', 'зельман', 'залман', 'меер', 'мейер', 'бер', 'берко', 'ошер', 'роман', 'марк', 'лея',
  'зоя', 'ефим', 'хаим', 'илья', 'ольга', 'анна', 'семен', 'абрам', 'борис',
]);

// Russian surname morphology, female forms first (they also match the male tails).
const FEMALE_SURNAME_ENDINGS = ['ова', 'ева', 'ёва', 'ина', 'ская', 'цкая'];
const MALE_SURNAME_ENDINGS = ['ов', 'ев', 'ёв', 'ин', 'ын', 'ский', 'цкий', 'ман', 'ер', 'ич', 'ко', 'ук', 'юк', 'ович'];

// Endings that make the *given* token look like a surname even without a known-given-name match.
const STRONG_SURNAME_ENDINGS = ['ская', 'ский', 'цкий', 'цкая', 'штейн', 'берг', 'ович', 'евич', 'ман'];
// -ова/-ева/-ина only count when the token is not a known given name (Антонина, Валентина, Нина…).
const STRONG_FEMALE_ENDINGS = ['ова', 'ева', 'ина'];
const PATRONYMIC_SUFFIX_RE = /(инична|овна|евна|ична|ович|евич|ич)$/;

/** Short reason codes reported for every ambiguous row. */
const SPLIT_REASONS = [
  'empty-name',
  'order-unknown',
  'hebrew',
  'too-few-tokens',
  'shape',
  'multi-given',
  'punct',
  'surname-is-given-name',
  'given-shape',
  'identity-mismatch',
];

function tokensOf(value) {
  return String(value == null ? '' : value).split(/\s+/).filter(Boolean);
}

/** The stored name as compared for identity: trimmed, inner whitespace collapsed to one space. */
function collapseWhitespace(value) {
  return String(value == null ? '' : value).trim().replace(/\s+/g, ' ');
}

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

/** A plain Cyrillic word (hyphen allowed), with no brackets, initials, dots or dashes with spaces. */
function isPlainCyrillicWord(token) {
  return CYRILLIC_WORD_RE.test(String(token == null ? '' : token));
}

/**
 * Russian surname morphology (-ов/-ев/-ёв/-ин/-ын/-ский/-цкий/-ман/-ер/-ич/-ко/-ук/-юк/-ович,
 * female -ова/-ева/-ина/-ская/-цкая). Hebrew and Latin tokens never match.
 */
function isRussianSurnameToken(token) {
  const word = cleanToken(token);
  if (!word || isPatronymicPrefixToken(word) || !/[\u0400-\u04FF]/.test(word)) {
    return false;
  }
  return hasEnding(word, FEMALE_SURNAME_ENDINGS) || hasEnding(word, MALE_SURNAME_ENDINGS);
}

/** Does this (lowercased) token look like a surname by its ending alone? */
function hasStrongSurnameShape(lower) {
  if (STRONG_SURNAME_ENDINGS.some((ending) => lower.endsWith(ending))) {
    return true;
  }
  return STRONG_FEMALE_ENDINGS.some((ending) => lower.endsWith(ending));
}

function toTokenSet(value) {
  if (value instanceof Set) {
    return value;
  }
  if (Array.isArray(value)) {
    return new Set(value.map((entry) => String(entry == null ? '' : entry).toLowerCase()));
  }
  return new Set();
}

/**
 * 1.40.1: the community's own evidence about which token is a given name.
 *
 * Looks at the names shaped «<A> <B> бен|бат …» (two tokens before the marker) and collects the token
 * that sits at the given-name position for this community's order: B for surname-first, A for
 * given-first. A surname that the community itself uses as a given name (Анна, Лев, Нина…) is never
 * split away, even when it has no surname-like ending or is not in the builtin list.
 *
 * @param {Array<string|{name?: string}>} names
 * @param {'surname-first'|'given-first'|''} order
 * @returns {Set<string>} lowercased given-name tokens
 */
function buildGivenAtPos(names, order = '') {
  const givenIndex = order === 'given-first' ? 0 : 1;
  const givenAtPos = new Set();
  (Array.isArray(names) ? names : []).forEach((entry) => {
    const value = typeof entry === 'string' ? entry : (entry && entry.name);
    const tokens = tokensOf(value);
    if (tokens.length < 3 || !isPatronymicPrefixToken(tokens[2])) {
      return;
    }
    const token = tokens[givenIndex];
    if (token) {
      givenAtPos.add(token.toLowerCase());
    }
  });
  return givenAtPos;
}

/**
 * @param {{name?: string, surname?: string, givenName?: string}} person
 * @param {'surname-first'|'given-first'|''} order the community convention.
 * @param {{givenAtPos?: Set<string>|string[]}} [ctx] per-community context (lib/name-normalization-run).
 * @returns {{alreadySplit?: boolean, surname?: string, givenName?: string, reason?: string}}
 *   `reason` is '' for a confident split, otherwise one of SPLIT_REASONS.
 */
function proposeSurnameSplit(person, order, ctx) {
  const source = person || {};
  const rawName = String(source.name == null ? '' : source.name);
  const storedSurname = String(source.surname || '').trim();
  const storedGiven = String(source.givenName || '').trim();

  if (storedSurname || storedGiven) {
    return { alreadySplit: true, reason: '' };
  }
  if (!collapseWhitespace(rawName)) {
    return { reason: 'empty-name' };
  }
  // 1. Hebrew-script names: no Russian morphology and no fixed order, so never confident.
  if (HEBREW_RE.test(rawName)) {
    return { reason: 'hebrew' };
  }
  if (order !== 'surname-first' && order !== 'given-first') {
    return { reason: 'order-unknown' };
  }

  const name = collapseWhitespace(rawName);
  const tokens = tokensOf(name);
  if (tokens.length < 2) {
    return { reason: 'too-few-tokens' };
  }

  // 2. Plain Cyrillic words only: brackets, initials, dots and a dash written with spaces are never
  //    split. Checked before the shape so «Иванов - Иван бен Моисей» is reported as punctuation
  //    rather than "too many tokens before the marker".
  const markerIndex = tokens.findIndex((token) => isPatronymicPrefixToken(token));
  if (!isPlainCyrillicWord(tokens[0]) || !isPlainCyrillicWord(tokens[1])) {
    return { reason: 'punct' };
  }

  // 3. Shape: exactly two name tokens before the בן/בת marker, or a plain 2-token name, or a
  //    2-token name followed by a Russian patronymic (…овна / …евич / …ич).
  let head;
  let needsEvidence = false;
  if (markerIndex === 2) {
    head = tokens.slice(0, 2);
  } else if (markerIndex === -1) {
    if (tokens.length === 2) {
      head = tokens;
    } else if (tokens.length === 3 && PATRONYMIC_SUFFIX_RE.test(tokens[2].toLowerCase())) {
      head = tokens.slice(0, 2);
    } else {
      return { reason: 'shape' };
    }
    needsEvidence = true;
  } else if (markerIndex > 2) {
    return { reason: 'multi-given' };
  } else {
    return { reason: 'shape' };
  }

  const surnameIndex = order === 'given-first' ? 1 : 0;
  const givenIndex = 1 - surnameIndex;
  const surname = head[surnameIndex];
  const givenToken = head[givenIndex];

  const givenAtPos = toTokenSet(ctx && ctx.givenAtPos);
  const surnameLower = String(surname).toLowerCase();
  const givenLower = String(givenToken).toLowerCase();
  const surnameIsGivenName = COMMON_GIVEN_NAMES.has(surnameLower) || givenAtPos.has(surnameLower);
  const givenIsKnownName = COMMON_GIVEN_NAMES.has(givenLower) || givenAtPos.has(givenLower);

  // Without a marker there is no structural evidence, so ask for surname morphology or a known given
  // name before splitting anything.
  if (needsEvidence && !(isRussianSurnameToken(surname) || givenIsKnownName)) {
    return { reason: 'shape' };
  }

  // 4. The token we would keep as a given name must not be a given name itself.
  if (surnameIsGivenName) {
    return { reason: 'surname-is-given-name' };
  }

  // 5. The token we would split off must not look like a surname (unless it is a known given name).
  if (!givenIsKnownName && hasStrongSurnameShape(givenLower)) {
    return { reason: 'given-shape' };
  }

  // 6. The split must reproduce the stored name exactly (whitespace trimmed and collapsed).
  const givenName = tokens.filter((_, i) => i !== surnameIndex).join(' ');
  if (composePersonName({ surname, givenName }, order) !== name) {
    return { reason: 'identity-mismatch' };
  }
  return { surname, givenName, reason: '' };
}

module.exports = {
  COMMON_GIVEN_NAMES,
  SPLIT_REASONS,
  isRussianSurnameToken,
  isPatronymicPrefixToken,
  hasStrongSurnameShape,
  buildGivenAtPos,
  proposeSurnameSplit,
};
