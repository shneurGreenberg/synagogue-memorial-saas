const { getVisibleCommunityEvents } = require('./community-events');
const { normalizePublicSubmission } = require('./public-submission');
const { parseOptionalDeathDate } = require('./death-date');
const { isPersonPermanentActive } = require('./permanent-person');
const { composePersonName, torahReadingName, normalizeNameOrder } = require('./person-name');
const { buildGivenAtPos } = require('./split-surname');

const PUBLIC_BOARD_FIELDS = [
  'slug',
  'name',
  'title',
  'boardTitleText',
  'boardSubtitle',
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
  'boardHideSearchAndPager',
  'reloadTimeout',
  'baseUrl',
  'presentationOverlay',
  'slideshow',
  'boardMode',
  'combinedInfoScale',
  'combinedZmanimScale',
  'combinedPrayersScale',
  'combinedAnnouncementScale',
  'hebrewDatesOnly',
  'boardCalendar',
  'dateDisplay',
  'prayerTimes',
  'boardSectionTitles',
];

function slimPublicPerson(person, { includeText = false, nameOrder = '', lang = '', givenAtPos = null } = {}) {
  if (!person || typeof person !== 'object') {
    return person;
  }

  const gregorianDateOfDeath = parseOptionalDeathDate(person.gregorianDateOfDeath);

  const publicPerson = {
    id: person.id,
    // 1.40.0 I88 / 1.41.0: the composed display name for the community's name order.
    name: composePersonName(person, nameOrder, lang) || person.name,
    // The Torah reading drops the surname (given name + בן/בת + parent).
    torahName: torahReadingName(person, lang, nameOrder, givenAtPos),
    gregorianDateOfDeath,
    hasDeathDate: !!gregorianDateOfDeath,
    photo: person.photo,
    photoCrop: person.photoCrop,
    title: person.title,
  };

  if (isPersonPermanentActive(person)) {
    publicPerson.permanent = true;
    if (person.permanentUntil) {
      publicPerson.permanentUntil = new Date(person.permanentUntil).toISOString();
    }
  }

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
  const nameOrder = normalizeNameOrder(board.nameOrder);
  const givenAtPos = nameOrder === 'surname-first'
    ? buildGivenAtPos(board.people, nameOrder)
    : null;

  PUBLIC_BOARD_FIELDS.forEach((field) => {
    if (board[field] !== undefined) {
      payload[field] = board[field];
    }
  });

  payload.people = Array.isArray(board.people)
    ? board.people.map((person) => slimPublicPerson(person, {
      includeText,
      nameOrder,
      lang: board.language || '',
      givenAtPos,
    }))
    : [];

  payload.communityEvents = getVisibleCommunityEvents(board.communityEvents || []);
  payload.publicSubmission = normalizePublicSubmission(board.publicSubmission, board.provisioning);

  return payload;
}

function toPublicPersonPayload(person, options = {}) {
  return slimPublicPerson(person, { includeText: true, ...options });
}

module.exports = {
  PUBLIC_BOARD_FIELDS,
  slimPublicPerson,
  toPublicBoardPayload,
  toPublicPersonPayload,
};
