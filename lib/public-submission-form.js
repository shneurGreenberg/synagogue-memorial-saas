const { parseOptionalDeathDate } = require('./death-date');
const { parseDdMmYyyy } = require('./dd-mm-yyyy-date');
const { parseDiedAfterSunset } = require('./died-after-sunset');
const { parseRelationFromBody, normalizeRelationKey } = require('./submission-relation');
const { combineDeceasedDisplayName } = require('./public-deceased-name');
const { normalizeParentRelation } = require('./person-name');

/**
 * 1.41.0: the public form asks for the given name only («Иван»); the parent has its own field and
 * the בן/בת marker comes from the male/female choice. A legacy `name` field is still accepted.
 */
function resolveDeceasedNameFromFields(fields) {
  const combined = combineDeceasedDisplayName(fields.surname, fields.givenName || fields.firstName);
  if (combined) {
    return combined;
  }
  return String(fields.name || '').trim().slice(0, 120);
}

function parseIsoDeathDate(iso) {
  const value = String(iso || '').trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const date = Number.parseInt(match[3], 10);
  return parseOptionalDeathDate({ year, month, date });
}

function parseLegacyDeathDate(body) {
  const month = parseInt(body.month, 10);
  const date = parseInt(body.date, 10);
  const year = parseInt(body.year, 10);
  if (!Number.isFinite(month) || !Number.isFinite(date) || !Number.isFinite(year)) {
    return null;
  }
  return parseOptionalDeathDate({ month, date, year });
}

function deathDateFromParts(fields) {
  if (!fields || typeof fields !== 'object') {
    return null;
  }
  const day = parseInt(fields.deathDay, 10);
  const month = parseInt(fields.deathMonth, 10);
  const year = parseInt(fields.deathYear, 10);
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
    return null;
  }
  return parseOptionalDeathDate({ month, date: day, year });
}

function deathDateFromFields(fields) {
  if (!fields || typeof fields !== 'object') {
    return null;
  }
  const fromDisplay = parseDdMmYyyy(fields.deathDate);
  if (fromDisplay) {
    return fromDisplay;
  }
  const fromIso = parseIsoDeathDate(fields.deathDate || fields.deathDateIso);
  if (fromIso) {
    return fromIso;
  }
  const fromParts = deathDateFromParts(fields);
  if (fromParts) {
    return fromParts;
  }
  return parseLegacyDeathDate(fields);
}

function parseDeceasedGender(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'female' || value === 'bat') {
    return 'female';
  }
  if (value === 'male' || value === 'ben') {
    return 'male';
  }
  return '';
}

/**
 * 1.41.0: the בן/בת marker of a submission. An explicit field wins, otherwise it follows the
 * male/female choice.
 */
function parseDeceasedParentRelation(fields) {
  const source = fields || {};
  const explicit = normalizeParentRelation(source.parentRelation);
  if (explicit) {
    return explicit;
  }
  const gender = parseDeceasedGender(source.deceasedGender);
  if (gender === 'female') {
    return 'bat';
  }
  if (gender === 'male') {
    return 'ben';
  }
  return '';
}

function sortedDeceasedKeys(raw) {
  if (!raw || typeof raw !== 'object') {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.map((_, index) => String(index));
  }
  return Object.keys(raw).sort((a, b) => Number(a) - Number(b));
}

function parseDeceasedEntriesFromBody(body) {
  const source = body || {};
  const raw = source.deceased;
  const sharedNotes = String(source.deceasedNotes || '').trim().slice(0, 2000);

  if (raw && typeof raw === 'object') {
    return sortedDeceasedKeys(raw).map((key) => {
      const fields = raw[key] || {};
      // 1.31.3: Hebrew date of death; the daytime Gregorian date is stored with diedAfterSunset=false.
      if (String(fields.deathDateMode || '') === 'hebrew') {
        const { hebrewDeathToGregorian } = require('./hebrew-death-input');
        const converted = hebrewDeathToGregorian(fields.hebrewDay, fields.hebrewMonth, fields.hebrewYear);
        fields.deathDate = converted
          ? `${String(converted.gregorian.date).padStart(2, '0')}.${String(converted.gregorian.month).padStart(2, '0')}.${converted.gregorian.year}`
          : '';
        fields.diedAfterSunset = 'before';
      }
      return {
        name: resolveDeceasedNameFromFields(fields),
        // 1.40.0 I88: surname and given name stay separate for the board name + Torah reading.
        // 1.41.0: three normalized parts — the given name words, the parent name and its marker.
        surname: String(fields.surname || '').trim().slice(0, 120),
        givenName: String(fields.givenName || fields.firstName || '').trim().slice(0, 120),
        parentName: String(fields.parentName || fields.fatherName || '').trim().slice(0, 120),
        parentRelation: parseDeceasedParentRelation(fields),
        gregorianDateOfDeath: deathDateFromFields(fields),
        diedAfterSunset: parseDiedAfterSunset(fields.diedAfterSunset),
        deceasedNotes: String(fields.deceasedNotes || sharedNotes).trim().slice(0, 2000),
        ...parseRelationFromBody(fields, source.lang),
        deceasedGender: parseDeceasedGender(fields.deceasedGender),
        deathDateIso: String(fields.deathDate || '').trim(),
        deathDay: String(fields.deathDay || '').trim(),
        deathMonth: String(fields.deathMonth || '').trim(),
        deathYear: String(fields.deathYear || '').trim(),
        rawFields: fields,
      };
    });
  }

  const singleName = String(source.name || '').trim().slice(0, 120);
  const givenName = String(source.givenName || source.firstName || '').trim().slice(0, 120);
  const parentName = String(
    source.parentName || source.fatherName || source.deceasedFatherName || '',
  ).trim().slice(0, 120);
  const deathDate = deathDateFromFields(source) || parseLegacyDeathDate(source);
  if (!singleName && !givenName && !deathDate) {
    return [];
  }

  const legacyRelation = String(source.relation || '').trim().slice(0, 120);
  return [{
    name: singleName || givenName,
    surname: String(source.surname || '').trim().slice(0, 120),
    givenName,
    parentName,
    parentRelation: parseDeceasedParentRelation(source),
    gregorianDateOfDeath: deathDate,
    diedAfterSunset: parseDiedAfterSunset(source.diedAfterSunset),
    deceasedNotes: sharedNotes,
    relationKey: normalizeRelationKey(source.relationKey) || (legacyRelation ? 'other' : ''),
    relationOther: legacyRelation,
    relation: legacyRelation || parseRelationFromBody(source, source.lang).relation,
    deathDateIso: String(source.deathDate || '').trim(),
  }];
}

function validateDeceasedEntries(entries) {
  if (!entries.length) {
    return 'required';
  }
  for (const entry of entries) {
    if (!entry.name) {
      return 'required';
    }
    if (!entry.parentName) {
      return 'father';
    }
    if (!entry.relationKey) {
      return 'required';
    }
    if (!entry.deceasedGender) {
      return 'required';
    }
    if (entry.relationKey === 'other' && !entry.relationOther) {
      return 'required';
    }
    if (!entry.gregorianDateOfDeath) {
      return 'date';
    }
  }
  return '';
}

function indexPhotoFiles(files) {
  const map = new Map();
  if (!Array.isArray(files)) {
    return map;
  }
  for (const file of files) {
    if (!file || !file.fieldname) {
      continue;
    }
    map.set(file.fieldname, file);
  }
  return map;
}

function photoFieldName(index) {
  return `deceased[${index}][photo]`;
}

module.exports = {
  parseIsoDeathDate,
  deathDateFromParts,
  parseDeceasedGender,
  parseDeceasedParentRelation,
  parseDeceasedEntriesFromBody,
  validateDeceasedEntries,
  indexPhotoFiles,
  photoFieldName,
};
