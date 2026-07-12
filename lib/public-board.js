const { getVisibleCommunityEvents } = require('./community-events');
const { normalizePublicSubmission } = require('./public-submission');

const PUBLIC_BOARD_FIELDS = [
  'slug',
  'name',
  'title',
  'titles',
  'language',
  'location',
  'theme',
  'people',
  'dailyCites',
  'communityEvents',
  'boardFeatures',
  'publicSubmission',
  'memorialQrPanel',
  'weeklyChapterEnabled',
  'shabbatTimesEnabled',
  'reloadTimeout',
  'slideshow',
  'baseUrl',
];

function slimPublicPerson(person, { includeText = false } = {}) {
  if (!person || typeof person !== 'object') {
    return person;
  }

  const publicPerson = {
    id: person.id,
    name: person.name,
    gregorianDateOfDeath: person.gregorianDateOfDeath,
    photo: person.photo,
    photoCrop: person.photoCrop,
    title: person.title,
  };

  if (includeText) {
    publicPerson.text = person.text || '';
  }

  return publicPerson;
}

function toPublicBoardPayload(board, { includeText = false } = {}) {
  if (!board || typeof board !== 'object') {
    return board;
  }

  const payload = {};

  PUBLIC_BOARD_FIELDS.forEach((field) => {
    if (board[field] !== undefined) {
      payload[field] = board[field];
    }
  });

  payload.people = Array.isArray(board.people)
    ? board.people.map((person) => slimPublicPerson(person, { includeText }))
    : [];

  payload.communityEvents = getVisibleCommunityEvents(board.communityEvents || []);
  payload.publicSubmission = normalizePublicSubmission(board.publicSubmission, board.provisioning);

  return payload;
}

function toPublicPersonPayload(person) {
  return slimPublicPerson(person, { includeText: true });
}

module.exports = {
  PUBLIC_BOARD_FIELDS,
  slimPublicPerson,
  toPublicBoardPayload,
  toPublicPersonPayload,
};
