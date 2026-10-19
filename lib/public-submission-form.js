const { parseOptionalDeathDate } = require('./death-date');
const { parseDiedAfterSunset } = require('./died-after-sunset');
const { parseRelationFromBody, normalizeRelationKey } = require('./submission-relation');

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

function deathDateFromFields(fields) {
  if (!fields || typeof fields !== 'object') {
    return null;
  }
  const fromIso = parseIsoDeathDate(fields.deathDate || fields.deathDateIso);
  if (fromIso) {
    return fromIso;
  }
  return parseLegacyDeathDate(fields);
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
      return {
        name: String(fields.name || '').trim().slice(0, 120),
        fatherName: String(fields.fatherName || '').trim().slice(0, 120),
        gregorianDateOfDeath: deathDateFromFields(fields),
        diedAfterSunset: parseDiedAfterSunset(fields.diedAfterSunset),
        deceasedNotes: String(fields.deceasedNotes || sharedNotes).trim().slice(0, 2000),
        ...parseRelationFromBody(fields, source.lang),
        deathDateIso: String(fields.deathDate || '').trim(),
        rawFields: fields,
      };
    });
  }

  const singleName = String(source.name || '').trim().slice(0, 120);
  const deathDate = deathDateFromFields(source) || parseLegacyDeathDate(source);
  if (!singleName && !deathDate) {
    return [];
  }

  const legacyRelation = String(source.relation || '').trim().slice(0, 120);
  return [{
    name: singleName,
    fatherName: String(source.fatherName || source.deceasedFatherName || '').trim().slice(0, 120),
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
    if (!entry.fatherName) {
      return 'father';
    }
    if (!entry.relationKey) {
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
  parseDeceasedEntriesFromBody,
  validateDeceasedEntries,
  indexPhotoFiles,
  photoFieldName,
};
