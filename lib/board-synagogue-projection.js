/**
 * MongoDB projection for public memorial board loads (API + SSR).
 * Omits admin-only blobs and heavy person fields; behavior matches full load + public-board slimming.
 */
const BOARD_SYNAGOGUE_SELECT = [
  '-adminUsers',
  '-adminPasswordHash',
  '-contactDirectory',
  '-savedViews',
  '-activeSavedViewId',
  '-boardClients',
  '-yahrzeitReminders.notifyEmail',
  '-yahrzeitReminders.lastNotifiedDate',
  '-yahrzeitReminders.enabled',
  '-weeklyKaddishWhatsapp',
  '-weeklyKaddishConfirmation',
  '-lastRefreshedCodeVersion',
  '-people.text',
  '-people.contact',
  '-people.contacts',
  '-people.internalNotes',
  '-adminYahrzeitTodayCache',
  '-adminWeeklyKaddishCache',
  '-provisioning.contactFiles',
  '-provisioning.notes',
  '-provisioning.skippedSteps',
  '-provisioning.createdAt',
].join(' ');

const BOARD_LITE_SELECT = 'slug location language';

function applyBoardSynagogueProjection(query, { includePeopleText = false } = {}) {
  let select = BOARD_SYNAGOGUE_SELECT;
  if (includePeopleText) {
    select = select.replace(/\s*-people\.text\s*/g, ' ').trim();
  }
  return query.select(select);
}

module.exports = {
  BOARD_SYNAGOGUE_SELECT,
  BOARD_LITE_SELECT,
  applyBoardSynagogueProjection,
};
