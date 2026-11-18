/**
 * 1.40.0 I88: a deceased person can be stored with a separate surname and given name.
 * 1.41.0: the name is stored in normalized parts — surname, givenName (only the given-name words,
 * e.g. «Иван»), parentName («Александр») and parentRelation (the marker: 'ben' | 'bat').
 * `name` stays the composed display string so every existing consumer keeps working untouched.
 * Legacy rows whose givenName still contains the בן/בת marker («Иван бен Александр») are supported:
 * no marker is added there, the stored given name is used as the base as-is.
 *
 * Communities differ in how they write a name on the board:
 *   surname-first: «Иванов Иван бен Александр»
 *   given-first:   «Иван Иванов бен Александр»
 *   surname-last:  «אברהם בן יצחק כהן» (given, marker, parents, then the surname)
 */
const { genderPrefix, detectNameScript } = require('./deceased-board-name');

// בן/בת (Hebrew script), бен/бат (Cyrillic), ben/bat (Latin).
const PATRONYMIC_PREFIXES = ['בן', 'בת', 'бен', 'бат', 'ben', 'bat'];

// Russian surname morphology: only clear-cut endings are treated as a surname.
const SURNAME_ENDINGS = [
  'ова', 'ева', 'ёва', 'ина', 'ына', 'ская', 'цкая', 'ая',
  'ов', 'ев', 'ёв', 'ин', 'ын', 'ский', 'цкий', 'ман', 'ер', 'ич',
];

const CYRILLIC_RE = /[\u0400-\u04FF]/;

const NAME_ORDERS = ['surname-first', 'given-first', 'surname-last'];

// 1.41.0: the parent marker per relation. A legacy marker word inside the given name wins.
const PARENT_RELATIONS = ['ben', 'bat'];

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

/** 'ben' | 'bat' | '' — the stored marker, without guessing from the gender. */
function normalizeParentRelation(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'bat' || value === 'בת' || value === 'бат') return 'bat';
  if (value === 'ben' || value === 'בן' || value === 'бен') return 'ben';
  return '';
}

/** The marker word inside a legacy given name (givenName = «Иван бен Александр»), or ''. */
function legacyGivenNameMarker(givenName) {
  const token = String(givenName || '').split(/\s+/).find((part) => isPatronymicPrefix(part));
  return token || '';
}

function hasLegacyMarker(givenName) {
  return !!legacyGivenNameMarker(givenName);
}

/**
 * The בן/בת word for a person: the stored parentRelation, otherwise the gender, written in the
 * script of the given/parent text (Hebrew / Cyrillic / Latin), the community language as fallback.
 */
function parentMarker(person, fallbackLang) {
  const source = person || {};
  const fromGender = String(source.gender || '').trim() === 'female' ? 'female' : 'male';
  let relation = normalizeParentRelation(source.parentRelation);
  if (!relation) {
    relation = fromGender === 'female' ? 'bat' : 'ben';
  }
  const script = detectNameScript(`${source.givenName || ''} ${source.parentName || ''}`) || fallbackLang;
  return genderPrefix(relation === 'bat' ? 'female' : 'male', script);
}

/**
 * The name without the surname: given name, then the בן/בת marker and the parent name.
 * A legacy given name that already carries its marker is left exactly as stored.
 */
function givenNameBase(person, fallbackLang) {
  const source = person || {};
  const givenName = String(source.givenName || '').trim();
  const parentName = String(source.parentName || '').trim();
  if (!givenName) {
    return '';
  }
  if (hasLegacyMarker(givenName)) {
    return givenName;
  }
  if (!parentName) {
    return givenName;
  }
  return `${givenName} ${parentMarker(source, fallbackLang)} ${parentName}`.trim();
}

/**
 * given-first: the surname goes right after the first given-name token, before бен/бат.
 * Splits on whitespace only and keeps every character, so parentheses/commas/dots inside the
 * given name survive («Евгений бен Самуила (Йосиф)» → «Евгений Виленкин бен Самуила (Йосиф)»).
 */
function insertSurnameAfterFirstName(givenName, surname) {
  const tokens = String(givenName || '').split(/\s+/).filter(Boolean);
  if (!tokens.length) {
    return surname;
  }
  if (isPatronymicPrefix(tokens[0])) {
    return `${surname} ${tokens.join(' ')}`.trim();
  }
  return [tokens[0], surname, tokens.slice(1).join(' ')].filter(Boolean).join(' ').trim();
}

/**
 * @param {{name?: string, surname?: string, givenName?: string, parentName?: string,
 *          parentRelation?: string, gender?: string}} person
 * @param {'surname-first'|'given-first'|'surname-last'|''} order '' falls back to surname-first.
 * @param {'he'|'ru'|'en'} [fallbackLang] script fallback for the בן/בת word (default 'ru').
 * @returns {string} the stored name unchanged when there is no givenName to build from.
 */
function composePersonName(person, order, fallbackLang) {
  const source = person || {};
  const surname = String(source.surname || '').trim();
  const base = givenNameBase(source, fallbackLang);
  if (!base) {
    return source.name || '';
  }
  if (!surname) {
    return base;
  }
  if (order === 'given-first') {
    return insertSurnameAfterFirstName(base, surname);
  }
  // 1.42.0 I93: Hebrew rows keep the surname after the parent («אברהם בן יצחק כהן»).
  if (order === 'surname-last') {
    return `${base} ${surname}`.trim();
  }
  return `${surname} ${base}`.trim();
}

/**
 * 1.41.0: the canonical stored name — always surname-first, independent of the board setting.
 */
function composeAdminName(person, fallbackLang) {
  return composePersonName(person, 'surname-first', fallbackLang);
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

const HEBREW_SCRIPT_RE = /[\u0590-\u05FF]/;

function knownGivenNameSet() {
  return require('./split-surname').COMMON_GIVEN_NAMES;
}

function isKnownGivenToken(token, givenAtPos) {
  const lower = String(token || '').replace(/[(),.]/g, '').trim().toLowerCase();
  if (!lower || isPatronymicPrefix(lower)) {
    return false;
  }
  if (knownGivenNameSet().has(lower)) {
    return true;
  }
  if (givenAtPos && typeof givenAtPos.has === 'function') {
    return givenAtPos.has(lower);
  }
  if (Array.isArray(givenAtPos)) {
    return givenAtPos.some((entry) => String(entry || '').toLowerCase() === lower);
  }
  return false;
}

/** Empty, or only the word бен/бат/ben/bat — not a name we can read. */
function isSingleMarkerFragment(value) {
  const tokens = String(value || '').split(/\s+/).filter(Boolean);
  return tokens.length === 0 || (tokens.length === 1 && isPatronymicPrefix(tokens[0]));
}

/**
 * Partial split-parts rows: surname was never stored, but givenName still starts with it
 * (community order surname-first). Drop that leftover surname. Hebrew names stay as stored.
 */
function stripLeftoverSurname(givenName, order, givenAtPos) {
  const value = String(givenName || '').trim().replace(/\s+/g, ' ');
  if (!value || order !== 'surname-first' || HEBREW_SCRIPT_RE.test(value)) {
    return value;
  }

  const candidates = [];

  // (a) «X (Y) Z…» — the parenthetical is the other form of the surname.
  const paren = value.match(/^\S+\s+\([^)]*\)\s+(\S.*)$/);
  if (paren) {
    candidates.push(paren[1].trim());
  }

  // (b) «X-Y Z» or «X - Y Z» — a double surname written with a dash.
  const dashed = value.match(/^\S+\s*-\s*\S+\s+(\S.*)$/);
  if (dashed) {
    candidates.push(dashed[1].trim());
  }

  // (c) «X G1 G2 …» — X is not a given name, the next two tokens are.
  const tokens = value.split(/\s+/).filter(Boolean);
  if (tokens.length >= 3
    && !isKnownGivenToken(tokens[0], givenAtPos)
    && isKnownGivenToken(tokens[1], givenAtPos)
    && isKnownGivenToken(tokens[2], givenAtPos)) {
    candidates.push(tokens.slice(1).join(' '));
  }

  for (let i = 0; i < candidates.length; i += 1) {
    const next = candidates[i].replace(/\s+/g, ' ').trim();
    if (next && next !== value && !isSingleMarkerFragment(next)) {
      return next;
    }
  }
  return value;
}

/**
 * The name read out for the Torah reading: given name + בן/בת + parent, without the surname.
 * Falls back to the stored name (minus the surname when one is known).
 * @param {'surname-first'|'given-first'|''} [order] community name order (needed for leftover surnames).
 * @param {Set<string>|string[]} [givenAtPos] given names this community uses, when known.
 */
function torahReadingName(person, fallbackLang, order, givenAtPos) {
  const source = person || {};
  const surname = String(source.surname || '').trim();
  let working = source;
  if (!surname) {
    const stripped = stripLeftoverSurname(source.givenName, order, givenAtPos);
    if (stripped !== String(source.givenName || '').trim()) {
      working = { ...source, givenName: stripped };
    }
  }
  const base = givenNameBase(working, fallbackLang);
  if (base) {
    return base;
  }
  return removeSurnameFromName(source.name, surname);
}

module.exports = {
  PATRONYMIC_PREFIXES,
  SURNAME_ENDINGS,
  NAME_ORDERS,
  PARENT_RELATIONS,
  isPatronymicPrefix,
  isSurnameLikeToken,
  classifyNameOrder,
  detectNameOrder,
  normalizeNameOrder,
  normalizeParentRelation,
  legacyGivenNameMarker,
  hasLegacyMarker,
  parentMarker,
  givenNameBase,
  composePersonName,
  composeAdminName,
  resolveCommunityNameOrder,
  removeSurnameFromName,
  torahReadingName,
};
