/**
 * 1.42.0 I92/I93: finish rows the earlier split rules left partial (surname empty) or untouched.
 * `name` is never written. A row is written only when composePersonName(parts, order) equals the
 * stored name (trimmed, inner spaces collapsed).
 *
 * Shapes, per community:
 *   - «Surname (Maiden) Given бен|бат Parent» — surname keeps the parenthesis.
 *   - «X-Y Given бен …» or «X - Y Given бен …» — surname is the dashed text exactly as written.
 *   - «Surname Given1 Given2 бен …» when both given tokens are known. The middle token counts only
 *     from COMMON_GIVEN_NAMES, or when at least two other rows use it as a given name and it does
 *     not look like a surname. The third token is COMMON_GIVEN_NAMES or a given name on another row.
 *   - a reversed row («Анна Мирмильштейн бен …») is left alone and does not poison givenAtPos:
 *     a token that is the surname of 2+ other rows is not treated as a given name.
 *   - Hebrew «Given בן|בת Parent(s) Surname» when most marker-rows in the community have 2+ tokens
 *     after the marker and the last token repeats or is not a known Hebrew given name. The last
 *     token becomes the surname (name order 'surname-last'). Parents joined by «и» / «ו» stay one
 *     parentName.
 *   - A бен/бат/בן/בת token inside () or [] is not a marker. If every marker sits inside brackets
 *     the row is left alone ('marker-in-brackets').
 *   - «Surname Surname Given бен …» (three words before the marker) is left alone
 *     ('double-surname-no-dash') when the middle token is not a real given name: not in
 *     COMMON_GIVEN_NAMES, and not a given name on 2+ other rows that also does not look like a
 *     surname (isRussianSurnameToken, or a surname on another row). A row's own tokens never count.
 *     Two known given names (Зингель Ефим Хаим) still split.
 *   - A Hebrew surname-last row that already starts with a token other rows use as a trailing
 *     surname is left alone ('hebrew-leading-surname'). The parent's last word is never the surname.
 */
const { composePersonName, normalizeParentRelation } = require('./person-name');
const { COMMON_GIVEN_NAMES, hasStrongSurnameShape, isRussianSurnameToken } = require('./split-surname');

const HEBREW_RE = /[\u0590-\u05FF]/;

/** Given names that should stay in parentName when they are the last token and do not repeat. */
const HEBREW_GIVEN_NAMES = new Set([
  'אברהם', 'יצחק', 'יעקב', 'ישראל', 'משה', 'אהרן', 'דוד', 'שלמה', 'יוסף', 'שמואל',
  'בנימין', 'יהודה', 'נחום', 'חיים', 'מרדכי', 'מנחם', 'שמעון', 'ראובן', 'גד', 'אשר',
  'דן', 'נפתלי', 'זאב', 'אליהו', 'חנה', 'שרה', 'רבקה', 'רחל', 'לאה', 'מרים',
  'אסתר', 'דינה', 'רות', 'נעמי', 'חיה', 'פייגה', 'גולדה', 'ברכה',
]);

const PARTS2_REASONS = [
  'empty-name', 'no-marker', 'multi-marker', 'punct', 'reversed', 'shape',
  'unknown-given', 'identity-mismatch', 'hebrew', 'empty-part', 'surname-is-given-name',
  'marker-in-brackets', 'double-surname-no-dash', 'hebrew-leading-surname',
];

function collapseWhitespace(value) {
  return String(value == null ? '' : value).trim().replace(/\s+/g, ' ');
}

function tokensOf(value) {
  return collapseWhitespace(value).split(/\s+/).filter(Boolean);
}

function textOf(value) {
  return String(value == null ? '' : value).trim();
}

function markerIndexes(tokens) {
  const indexes = [];
  tokens.forEach((token, index) => {
    if (normalizeParentRelation(token)) indexes.push(index);
  });
  return indexes;
}

/** Tokens of `value`, and which of them begin inside () or []. */
function tokensWithBracketDepth(value) {
  const src = collapseWhitespace(value);
  const tokens = [];
  let depth = 0;
  let i = 0;
  while (i < src.length) {
    if (src[i] === ' ') { i += 1; continue; }
    const startDepth = depth;
    let word = '';
    while (i < src.length && src[i] !== ' ') {
      const ch = src[i];
      word += ch;
      if (ch === '(' || ch === '[') depth += 1;
      else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
      i += 1;
    }
    tokens.push({ token: word, inside: startDepth > 0 });
  }
  return tokens;
}

/**
 * Marker indexes that sit outside every bracket. `inside` is true when a бен/бат/בן/בת
 * token exists but only inside brackets.
 */
function markersOutsideBrackets(value) {
  const detailed = tokensWithBracketDepth(value);
  const tokens = detailed.map((item) => item.token);
  const indexes = [];
  let inside = false;
  detailed.forEach((item, index) => {
    if (!normalizeParentRelation(item.token)) return;
    if (item.inside) inside = true;
    else indexes.push(index);
  });
  return { tokens, indexes, inside };
}

function isKnownGiven(token, givenAtPos) {
  const lower = String(token || '').toLowerCase();
  if (!lower) return false;
  if (COMMON_GIVEN_NAMES.has(lower)) return true;
  return !!(givenAtPos && givenAtPos.has(lower));
}

/** Lowercased tokens this person itself would add to givenAtPos (same filter as the builder). */
function ownGivenTokens(person, context) {
  const own = new Set();
  const source = person || {};
  const ctx = context || {};
  const givenIndex = ctx.order === 'given-first' ? 0 : 1;
  const surnameCounts = ctx.surnameCounts || new Map();
  const add = (token) => {
    const lower = String(token || '').toLowerCase();
    if (!lower || normalizeParentRelation(lower)) return;
    if ((surnameCounts.get(lower) || 0) >= 2) return;
    own.add(lower);
  };
  const nameTokens = tokensOf(source.name);
  const markers = markerIndexes(nameTokens);
  if (markers.length === 1 && markers[0] === 2) add(nameTokens[givenIndex]);
  const given = textOf(source.givenName);
  if (given && !markerIndexes(tokensOf(given)).length) tokensOf(given).forEach(add);
  return own;
}

/**
 * givenAtPos with this person's own tokens removed. A token stays only when another row also uses it.
 * @param {object} person
 * @param {{givenAtPos?: Set<string>, givenCounts?: Map<string, number>}} context
 */
function givenAtPosExcludingSelf(person, context) {
  const base = context.givenAtPos || new Set();
  const counts = context.givenCounts;
  if (!counts) return base;
  const out = new Set(base);
  ownGivenTokens(person, context).forEach((token) => {
    if ((counts.get(token) || 0) <= 1) out.delete(token);
  });
  return out;
}

function otherGivenCount(token, person, context) {
  const lower = String(token || '').toLowerCase();
  const counts = context.givenCounts;
  if (!counts || !lower) return 0;
  const total = counts.get(lower) || 0;
  return ownGivenTokens(person, context).has(lower) ? Math.max(0, total - 1) : total;
}

/** True when some other row uses this token as its surname (name slot or stored surname). */
function usedAsSurnameOnAnotherRow(token, person, context) {
  const lower = String(token || '').toLowerCase();
  if (!lower) return false;
  const ctx = context || {};
  const surnameIndex = ctx.order === 'given-first' ? 1 : 0;
  const nameTokens = tokensOf(person && person.name);
  const markers = markerIndexes(nameTokens);
  const slot = (ctx.surnameCounts && ctx.surnameCounts.get(lower)) || 0;
  const selfSlot = markers.length === 1 && markers[0] === 2
    && String(nameTokens[surnameIndex] || '').toLowerCase() === lower;
  if ((selfSlot ? slot - 1 : slot) >= 1) return true;
  const stored = (ctx.storedSurnameCounts && ctx.storedSurnameCounts.get(lower)) || 0;
  const selfStored = tokensOf(person && person.surname).some((part) => part.toLowerCase() === lower);
  return (selfStored ? stored - 1 : stored) >= 1;
}

/**
 * Middle token of «A B C бен …». A community given-name hit counts only from other rows,
 * needs two of them, and loses when the token looks like a surname.
 */
function middleTokenIsGiven(token, person, context) {
  const lower = String(token || '').toLowerCase();
  if (!lower) return false;
  if (COMMON_GIVEN_NAMES.has(lower)) return true;
  if (otherGivenCount(token, person, context) < 2) return false;
  if (isRussianSurnameToken(token) || usedAsSurnameOnAnotherRow(token, person, context)) return false;
  return true;
}

/**
 * givenAtPos for this rule: the given-name slot of «A B бен|бат …» rows, minus any token that is
 * the surname of 2+ other rows (a single reversed row must not block the family).
 * @param {Array<string|{name?: string, givenName?: string}>} people
 * @param {'surname-first'|'given-first'|''} order
 */
function buildParts2Context(people, order = '') {
  const list = Array.isArray(people) ? people : [];
  const givenIndex = order === 'given-first' ? 0 : 1;
  const surnameIndex = order === 'given-first' ? 1 : 0;
  const surnameCounts = new Map();

  list.forEach((entry) => {
    const name = typeof entry === 'string' ? entry : (entry && entry.name);
    const tokens = tokensOf(name);
    const markers = markerIndexes(tokens);
    if (markers.length !== 1 || markers[0] !== 2) return;
    const surname = String(tokens[surnameIndex] || '').toLowerCase();
    if (!surname) return;
    surnameCounts.set(surname, (surnameCounts.get(surname) || 0) + 1);
  });

  const givenAtPos = new Set();
  const givenCounts = new Map();
  const storedSurnameCounts = new Map();
  const considerGiven = (token) => {
    const lower = String(token || '').toLowerCase();
    if (!lower || normalizeParentRelation(lower)) return '';
    // A family surname (2+ rows) is not evidence that the token is a given name.
    if ((surnameCounts.get(lower) || 0) >= 2) return '';
    return lower;
  };
  list.forEach((entry) => {
    const contributed = new Set();
    const name = typeof entry === 'string' ? entry : (entry && entry.name);
    const tokens = tokensOf(name);
    const markers = markerIndexes(tokens);
    if (markers.length === 1 && markers[0] === 2) {
      const given = considerGiven(tokens[givenIndex]);
      if (given) contributed.add(given);
    }
    if (entry && typeof entry !== 'string') {
      const given = textOf(entry.givenName);
      if (given && !markerIndexes(tokensOf(given)).length) {
        tokensOf(given).forEach((token) => {
          const lower = considerGiven(token);
          if (lower) contributed.add(lower);
        });
      }
      const seenSurname = new Set();
      tokensOf(entry.surname).forEach((token) => {
        const lower = token.toLowerCase();
        if (!lower || seenSurname.has(lower)) return;
        seenSurname.add(lower);
        storedSurnameCounts.set(lower, (storedSurnameCounts.get(lower) || 0) + 1);
      });
    }
    contributed.forEach((token) => {
      givenAtPos.add(token);
      givenCounts.set(token, (givenCounts.get(token) || 0) + 1);
    });
  });

  const lastTokenCounts = new Map();
  let hebrewMarkers = 0;
  let longTail = 0;
  list.forEach((entry) => {
    const name = typeof entry === 'string' ? entry : (entry && entry.name);
    if (!HEBREW_RE.test(String(name || ''))) return;
    const tokens = tokensOf(name);
    const markers = markerIndexes(tokens);
    if (markers.length !== 1) return;
    hebrewMarkers += 1;
    const tail = tokens.slice(markers[0] + 1);
    if (tail.length < 2) return;
    longTail += 1;
    const last = tail[tail.length - 1];
    lastTokenCounts.set(last, (lastTokenCounts.get(last) || 0) + 1);
  });

  let surnameLast = false;
  if (hebrewMarkers > 0 && longTail * 2 > hebrewMarkers) {
    for (const [token, count] of lastTokenCounts) {
      if (count >= 2 || !HEBREW_GIVEN_NAMES.has(token)) {
        surnameLast = true;
        break;
      }
    }
  }

  return { givenAtPos, givenCounts, surnameCounts, storedSurnameCounts, lastTokenCounts, surnameLast, order };
}

/**
 * @param {{name?: string, surname?: string, givenName?: string, parentName?: string, parentRelation?: string}} person
 * @param {'surname-first'|'given-first'|'surname-last'|''} order
 * @param {{givenAtPos?: Set<string>, surnameCounts?: Map<string, number>, lastTokenCounts?: Map<string, number>, surnameLast?: boolean}} [ctx]
 */
function proposeParts2Split(person, order, ctx) {
  const source = person || {};
  const storedName = collapseWhitespace(source.name);
  const storedSurname = textOf(source.surname);
  const storedGiven = textOf(source.givenName);
  const storedParent = textOf(source.parentName);
  const storedRelation = normalizeParentRelation(source.parentRelation) || '';
  const context = ctx || {};

  if (!storedName) return { reason: 'empty-name' };
  // Earlier rules already stored a surname. This rule only finishes empty-surname rows.
  if (storedSurname) return { alreadyDone: true };
  if (/[.]/.test(storedName)) return { reason: 'punct' };

  const located = markersOutsideBrackets(storedName);
  const tokens = located.tokens;
  const markers = located.indexes;
  if (!markers.length) return { reason: located.inside ? 'marker-in-brackets' : 'no-marker' };
  if (markers.length > 1) return { reason: 'multi-marker' };

  const index = markers[0];
  const head = tokens.slice(0, index);
  const tail = tokens.slice(index + 1);
  if (!head.length || !tail.length) return { reason: 'empty-part' };

  const headText = head.join(' ');
  const relation = normalizeParentRelation(tokens[index]);
  const hebrew = HEBREW_RE.test(storedName);
  const givenAtPos = givenAtPosExcludingSelf(source, context);
  const surnameCounts = context.surnameCounts || new Map();
  // The order the board will compose with. '' stays surname-first, same as composePersonName.
  const composeOrder = order === 'given-first' || order === 'surname-last' ? order : 'surname-first';

  let surname = '';
  let givenName = '';
  let parentName = '';

  if (hebrew) {
    if (composeOrder !== 'surname-last' || !context.surnameLast) return { reason: 'hebrew' };
    const last = tail[tail.length - 1];
    const leading = head[0];
    const trailingCount = (context.lastTokenCounts && context.lastTokenCounts.get(leading)) || 0;
    const selfAlsoTrailing = tail.length >= 2 && leading === last ? 1 : 0;
    if (trailingCount - selfAlsoTrailing >= 1) return { reason: 'hebrew-leading-surname' };
    if (tail.length < 2) return { reason: 'shape' };
    const repeats = (context.lastTokenCounts && context.lastTokenCounts.get(last) || 0) >= 2;
    if (!repeats && HEBREW_GIVEN_NAMES.has(last)) return { reason: 'shape' };
    surname = last;
    parentName = tail.slice(0, -1).join(' ');
    givenName = head.join(' ');
  } else {
    const maiden = headText.match(/^(.+?\([^)]+\))\s+(\S+)$/);
    const dashed = headText.match(/^(\S+\s*-\s*\S+)\s+(\S+)$/);
    if (maiden) {
      surname = maiden[1];
      givenName = maiden[2];
      parentName = tail.join(' ');
    } else if (dashed) {
      surname = dashed[1];
      givenName = dashed[2];
      parentName = tail.join(' ');
    } else if (head.length === 3 && composeOrder === 'surname-first') {
      const middleKnown = middleTokenIsGiven(head[1], source, context);
      const thirdKnown = isKnownGiven(head[2], givenAtPos);
      if (!middleKnown) return { reason: 'double-surname-no-dash' };
      if (!thirdKnown) return { reason: 'unknown-given' };
      surname = head[0];
      givenName = `${head[1]} ${head[2]}`;
      parentName = tail.join(' ');
    } else if (head.length === 2) {
      const a = head[0];
      const b = head[1];
      const aKnown = isKnownGiven(a, givenAtPos);
      const bKnown = isKnownGiven(b, givenAtPos);
      const aSurnameN = surnameCounts.get(a.toLowerCase()) || 0;
      const bSurnameN = surnameCounts.get(b.toLowerCase()) || 0;
      if (composeOrder === 'given-first') {
        if (bKnown && !aKnown && (hasStrongSurnameShape(a.toLowerCase()) || aSurnameN >= 2)) {
          return { reason: 'reversed' };
        }
        surname = b;
        givenName = a;
      } else if (aKnown && !bKnown && (hasStrongSurnameShape(b.toLowerCase()) || bSurnameN >= 2) && aSurnameN < 2) {
        return { reason: 'reversed' };
      } else if (aKnown && aSurnameN < 2) {
        return { reason: 'surname-is-given-name' };
      } else {
        surname = a;
        givenName = b;
      }
      parentName = tail.join(' ');
    } else {
      return { reason: 'shape' };
    }
  }

  if (!surname || !givenName || !parentName) return { reason: 'empty-part' };

  const parts = {
    surname, givenName, parentName, parentRelation: relation,
  };
  if (parts.surname === storedSurname && parts.givenName === storedGiven
    && parts.parentName === storedParent && parts.parentRelation === storedRelation) {
    return { alreadyDone: true };
  }
  if (collapseWhitespace(composePersonName(parts, composeOrder)) !== storedName) {
    return { reason: 'identity-mismatch' };
  }
  return {
    ...parts,
    partial: false,
    note: composeOrder,
    nameOrder: composeOrder === 'surname-last' ? 'surname-last' : '',
  };
}

module.exports = {
  PARTS2_REASONS,
  HEBREW_GIVEN_NAMES,
  buildParts2Context,
  proposeParts2Split,
};
