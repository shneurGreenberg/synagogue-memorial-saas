/**
 * 1.41.0 I89: finish the 1.40.0 surname split — a person is stored in normalized parts: surname,
 * givenName (only the given-name words, «Иван»), parentName («Александр») and parentRelation (the
 * marker: 'ben' | 'bat'), see lib/person-name.
 *
 * Two shapes are handled:
 *   - a row 1.40.0 already split still carries the marker inside givenName («Иван бен Александр»): the
 *     words before the marker become the given name, the words after it the parent name, and the
 *     marker itself the parentRelation (бен/בן/ben → ben, бат/בת/bat → bat);
 *   - an unsplit row goes through the 1.40.0 surname split first (lib/split-surname) and the rest is
 *     split the same way. When the surname stays ambiguous but the name has exactly one marker with
 *     words on both sides, only givenName/parentName/parentRelation are written (surname empty) and
 *     the given name keeps every word before the marker — a partial row is fine. A later run can
 *     finish it once the community's convention is clear.
 *
 * `name` is never touched. A row is written only when
 *   - the new parts compose back to the stored name (trimmed, inner whitespace collapsed), and
 *   - the Torah reading (given name + בן/בת + parent) stays the same. 1.40.0 removed the surname from
 *     that reading, so it is compared with the surname this rule separates already in place — for a
 *     row whose surname was apart already this is exactly torahReadingName(person).
 * Everything else is reported with a reason code and left untouched.
 */
const {
  composePersonName, torahReadingName, normalizeParentRelation, removeSurnameFromName,
} = require('./person-name');
const { proposeSurnameSplit, SPLIT_REASONS } = require('./split-surname');

/** Reason codes for a row this rule leaves alone (the surname-split codes are reused as they are). */
const PARTS_REASONS = [...SPLIT_REASONS, 'no-marker', 'multi-marker', 'empty-part', 'torah-mismatch'];

function collapseWhitespace(value) {
  return String(value == null ? '' : value).trim().replace(/\s+/g, ' ');
}

function tokensOf(value) {
  return String(value == null ? '' : value).split(/\s+/).filter(Boolean);
}

function textOf(value) {
  return String(value == null ? '' : value).trim();
}

/** Does this name part carry a בן/בת marker at all (i.e. is it still a legacy given name)? */
function hasMarker(value) {
  return tokensOf(value).some((token) => !!normalizeParentRelation(token));
}

/**
 * The one בן/בת marker inside a name part, with the words before and after it.
 * @param {string} value
 * @returns {{givenName: string, parentName: string, parentRelation: 'ben'|'bat'}|{reason: string}}
 */
function splitAtMarker(value) {
  const tokens = tokensOf(collapseWhitespace(value));
  const markers = [];
  tokens.forEach((token, index) => {
    if (normalizeParentRelation(token)) markers.push(index);
  });
  if (!markers.length) return { reason: 'no-marker' };
  if (markers.length > 1) return { reason: 'multi-marker' };
  const index = markers[0];
  const givenName = tokens.slice(0, index).join(' ');
  const parentName = tokens.slice(index + 1).join(' ');
  if (!givenName || !parentName) return { reason: 'empty-part' };
  return { givenName, parentName, parentRelation: normalizeParentRelation(tokens[index]) };
}

/**
 * @param {{id?: number, name?: string, surname?: string, givenName?: string, parentName?: string,
 *          parentRelation?: string, gender?: string}} person the stored person.
 * @param {'surname-first'|'given-first'|''} order the community convention (what the board composes with).
 * @param {{givenAtPos?: Set<string>|string[]}} [ctx] per-community context (lib/name-normalization-run).
 * @returns {{alreadyDone: true}|{reason: string}|{surname: string, givenName: string, parentName: string,
 *   parentRelation: 'ben'|'bat'|'', partial: boolean, note: string}}
 *   `reason` is set for a row that must be left untouched, `alreadyDone` when there is nothing to
 *   split any more, otherwise the parts to write (`note` carries why a partial row has no surname).
 */
function proposePartsSplit(person, order, ctx) {
  const source = person || {};
  const storedName = collapseWhitespace(source.name);
  const storedSurname = textOf(source.surname);
  const storedGiven = textOf(source.givenName);
  const storedParent = textOf(source.parentName);
  const storedRelation = normalizeParentRelation(source.parentRelation);

  if (!storedName) {
    return { reason: 'empty-name' };
  }

  let surname = storedSurname;
  let base = '';
  let note = '';

  if (storedGiven && hasMarker(storedGiven)) {
    // 1. A row 1.40.0 already split: the marker still sits inside the given name.
    base = storedGiven;
  } else if (storedSurname) {
    // The surname is already apart — take the rest of the name as the part to split.
    base = removeSurnameFromName(storedName, storedSurname) || storedName;
  } else {
    // 2. An unsplit (or partial) row: let the 1.40.0 rule name the surname first.
    const split = proposeSurnameSplit({ name: storedName }, order, ctx);
    if (split.surname) {
      surname = split.surname;
      base = split.givenName;
    } else {
      // The surname stays ambiguous: the row can still get its parent part (partial split).
      note = split.reason || 'shape';
      base = storedName;
    }
  }

  const marker = splitAtMarker(base);
  let parts;
  if (marker.reason === 'no-marker' && surname) {
    // A name without a parent part: only the given-name words are left to store.
    parts = { givenName: collapseWhitespace(base), parentName: '', parentRelation: '' };
  } else if (marker.reason) {
    return { reason: marker.reason === 'no-marker' ? (note || 'no-marker') : marker.reason };
  } else {
    parts = marker;
  }

  const newParts = {
    surname,
    givenName: collapseWhitespace(parts.givenName),
    parentName: collapseWhitespace(parts.parentName),
    parentRelation: parts.parentRelation || '',
  };
  if (!newParts.givenName) {
    return { reason: 'empty-part' };
  }

  // 3. Nothing to write: the stored parts already are exactly these.
  if (newParts.surname === storedSurname && newParts.givenName === storedGiven
    && newParts.parentName === storedParent && newParts.parentRelation === storedRelation) {
    return { alreadyDone: true };
  }

  // 4. The display name must stay byte-identical: the new parts compose back to the stored name…
  if (composePersonName(newParts, order) !== storedName) {
    return { reason: 'identity-mismatch' };
  }
  // …and the Torah reading must not change either. 1.40.0 keeps the surname out of that reading, so
  // the baseline is what the row reads today once the surname this rule separates is in place — for a
  // row whose surname was already apart this is exactly torahReadingName(person).
  const baseline = torahReadingName({ ...source, surname: newParts.surname || storedSurname });
  if (collapseWhitespace(torahReadingName(newParts)) !== collapseWhitespace(baseline)) {
    return { reason: 'torah-mismatch' };
  }

  return {
    surname: newParts.surname,
    givenName: newParts.givenName,
    parentName: newParts.parentName,
    parentRelation: newParts.parentRelation,
    partial: !newParts.surname,
    note: newParts.surname ? '' : note,
  };
}

module.exports = {
  PARTS_REASONS,
  proposePartsSplit,
  splitAtMarker,
  hasMarker,
};
