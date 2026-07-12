const crypto = require('crypto');
const { slimPublicPerson, toPublicBoardPayload } = require('./public-board');

const BOARD_VERSION_FIELDS = [
  'title',
  'titles',
  'language',
  'weeklyChapterEnabled',
  'theme',
  'people',
  'dailyCites',
  'communityEvents',
  'boardFeatures',
  'shabbatTimesEnabled',
  'memorialQrPanel',
  'location',
  'publicSubmission',
];

function slimPerson(person) {
  return slimPublicPerson(person, { includeText: false });
}

function slimBoardPayload(board) {
  return toPublicBoardPayload(board, { includeText: false });
}

function boardVersionSnapshot(board) {
  if (!board || typeof board !== 'object') {
    return {};
  }

  const snapshot = {};
  BOARD_VERSION_FIELDS.forEach((field) => {
    snapshot[field] = board[field];
  });
  return snapshot;
}

function computeBoardVersion(board) {
  const payload = JSON.stringify(boardVersionSnapshot(board));
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

function mergePersonText(existingPeople, nextPeople) {
  if (!Array.isArray(existingPeople) || !Array.isArray(nextPeople)) {
    return nextPeople;
  }

  const textById = new Map();
  existingPeople.forEach((person) => {
    if (person && person.id != null && person.text) {
      textById.set(String(person.id), person.text);
    }
  });

  return nextPeople.map((person) => {
    if (!person || person.text || !textById.has(String(person.id))) {
      return person;
    }

    return {
      ...person,
      text: textById.get(String(person.id)),
    };
  });
}

function mergeBoardPayload(existing, next, { preserveText = true } = {}) {
  if (!existing) {
    return next;
  }

  if (!preserveText) {
    return next;
  }

  return {
    ...next,
    people: mergePersonText(existing.people, next.people),
  };
}

module.exports = {
  slimBoardPayload,
  slimPerson,
  boardVersionSnapshot,
  computeBoardVersion,
  mergeBoardPayload,
  mergePersonText,
};
