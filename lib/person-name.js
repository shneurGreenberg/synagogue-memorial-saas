/**
 * 1.40.0 I88: a deceased person can be stored with a separate surname and given name
 * (givenName keeps the בן/בת builder output, e.g. «Иван бен Александр»). `name` stays the
 * composed display string so every existing consumer keeps working untouched.
 *
 * Communities differ in how they write a name on the board:
 *   surname-first: «Иванов Иван бен Александр»
 *   given-first:   «Иван Иванов бен Александр»
 */

// בן/בת (Hebrew script), бен/бат (Cyrillic), ben/bat (Latin).
const PATRONYMIC_PREFIXES = ['בן', 'בת', 'бен', 'бат', 'ben', 'bat'];

// Russian surname morphology: only clear-cut endings are treated as a surname.
const SURNAME_ENDINGS = [
  'ова', 'ева', 'ёва', 'ина', 'ына', 'ская', 'цкая', 'ая',
  'ов', 'ев', 'ёв', 'ин', 'ын', 'ский', 'цкий', 'ман', 'ер', 'ич',
];

const CYRILLIC_RE = /[\u0400-\u04FF]/;

const NAME_ORDERS = ['surname-first', 'given-first'];

function isPatronymicPrefix(token) {
  return PATRONYMIC_PREFIXES.includes(String(token || '').toLowerCase());
}

function nameTokens(value) {
  return String(value || '')
    .split(/\s+/)
    .map((token) => token.replace(/[(),.]/g, '').trim())
    .filter(Boolean);
}

/** Heuristic: does this single token look like a Russian surname? */
function isSurnameLikeToken(token) {
  const word = String(token || '').replace(/[(),.]/g, '').trim();
  if (!word || !CYRILLIC_RE.test(word) || isPatronymicPrefix(word)) {
    return false;
  }
  const lower = word.toLowerCase();
  return SURNAME_ENDINGS.some((ending) => lower.endsWith(ending));
}

/**
 * Which order does one stored display name follow? '' when it cannot be told (Hebrew names,
 * a single token, or both tokens looking like surnames, e.g. «Антонина Иванова»).
 */
function classifyNameOrder(name) {
  const tokens = nameTokens(name).filter((token) => !isPatronymicPrefix(token));
  if (tokens.length < 2) {
    return '';
  }
  const firstIsSurname = isSurnameLikeToken(tokens[0]);
  const secondIsSurname = isSurnameLikeToken(tokens[1]);
  if (firstIsSurname && !secondIsSurname) {
    return 'surname-first';
  }
  if (secondIsSurname && !firstIsSurname) {
    return 'given-first';
  }
  return '';
}

/**
 * Majority vote over a community's names. Returns '' when there is no clear winner
 * (tie, too few usable names, or names without Russian surname morphology).
 * @param {Array<string|{name?: string}>} names
 */
function detectNameOrder(names) {
  const list = Array.isArray(names) ? names : [];
  let surnameFirst = 0;
  let givenFirst = 0;

  list.forEach((entry) => {
    const value = typeof entry === 'string' ? entry : (entry && entry.name);
    const order = classifyNameOrder(value);
    if (order === 'surname-first') {
      surnameFirst += 1;
    } else if (order === 'given-first') {
      givenFirst += 1;
    }
  });

  const total = surnameFirst + givenFirst;
  // Two votes minimum and a 60% margin, otherwise the community default stays "unknown".
  if (total < 2) {
    return '';
  }
  if (surnameFirst >= total * 0.6) {
    return 'surname-first';
  }
  if (givenFirst >= total * 0.6) {
    return 'given-first';
  }
  return '';
}

function normalizeNameOrder(raw) {
  const value = String(raw || '').trim();
  return NAME_ORDERS.includes(value) ? value : '';
}

/** given-first: the surname goes right after the first given-name token, before бен/бат. */
function insertSurnameAfterFirstName(givenName, surname) {
  const tokens = nameTokens(givenName);
  if (!tokens.length) {
    return surname;
  }
  if (isPatronymicPrefix(tokens[0])) {
    return `${surname} ${tokens.join(' ')}`.trim();
  }
  return [tokens[0], surname, tokens.slice(1).join(' ')].filter(Boolean).join(' ').trim();
}

/**
 * @param {{name?: string, surname?: string, givenName?: string}} person
 * @param {'surname-first'|'given-first'|''} order '' falls back to surname-first.
 * @returns {string} the stored name unchanged unless surname AND givenName are both set.
 */
function composePersonName(person, order) {
  const source = person || {};
  const surname = String(source.surname || '').trim();
  const givenName = String(source.givenName || '').trim();
  if (!surname || !givenName) {
    return source.name || '';
  }
  if (order === 'given-first') {
    return insertSurnameAfterFirstName(givenName, surname);
  }
  return `${surname} ${givenName}`.trim();
}

/**
 * Community-wide order: the saved setting, otherwise detected from the stored names,
 * otherwise the fallback (used when building a new name).
 */
function resolveCommunityNameOrder(community, fallback = 'surname-first') {
  const explicit = normalizeNameOrder(community && community.nameOrder);
  if (explicit) {
    return explicit;
  }
  const people = community && Array.isArray(community.people) ? community.people : [];
  const detected = detectNameOrder(people.map((person) => (person && person.name) || ''));
  return detected || fallback;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Remove one occurrence of a known surname from a display name. Handles the three shapes the
 * board uses: «Иванов Иван …» (leading, surname-first), «Иван Иванов …» (right after the first
 * given-name token, given-first) and «… Иван Иванов» (trailing).
 */
function removeSurnameFromName(name, surname) {
  const value = String(name || '').trim();
  const family = String(surname || '').trim();
  if (!value || !family) {
    return value;
  }
  const escaped = escapeRegex(family);

  const leading = new RegExp(`^${escaped}\\s+`, 'i');
  if (leading.test(value)) {
    return value.replace(leading, '').trim();
  }

  // given-first: surname right after the first token (and not the only token).
  const afterFirst = new RegExp(`^(\\S+)\\s+${escaped}(?=\\s|$)`, 'i');
  if (afterFirst.test(value)) {
    return value.replace(afterFirst, '$1').replace(/\s+/g, ' ').trim();
  }

  const trailing = new RegExp(`\\s+${escaped}$`, 'i');
  if (trailing.test(value)) {
    return value.replace(trailing, '').trim();
  }

  return value;
}

/**
 * The name read out for the Torah reading: given name + בן/בת + parent, without the surname.
 * Falls back to the stored name (minus the surname when one is known).
 */
function torahReadingName(person) {
  const source = person || {};
  const surname = String(source.surname || '').trim();
  const givenName = String(source.givenName || '').trim();
  if (surname && givenName) {
    return givenName;
  }
  return removeSurnameFromName(source.name, surname);
}

module.exports = {
  PATRONYMIC_PREFIXES,
  SURNAME_ENDINGS,
  NAME_ORDERS,
  isSurnameLikeToken,
  classifyNameOrder,
  detectNameOrder,
  normalizeNameOrder,
  composePersonName,
  resolveCommunityNameOrder,
  removeSurnameFromName,
  torahReadingName,
};
