const Synagogue = require('../models/Synagogue');
const { normalizePublicSubmission } = require('./public-submission');
const { buildYahrzeitEntries, getPeopleWithYahrzeitThisWeekMissed, getDayKeyInTimezone, resolveSynagogueTimezone } = require('./yahrzeit');
const { buildYahrzeitMessage, buildMissedYahrzeitMessage, buildAdminReminderSubject, buildAdminReminderBody } = require('./yahrzeit-messages');
const { buildContactActionLink } = require('./contact-links');
const { normalizePersonContact, hasContactDetails } = require('./person-contact');
const { sendMail, isEmailConfigured } = require('./email');
const { getTranslator } = require('./admin-translations');

function normalizeYahrzeitReminders(raw) {
  const source = raw || {};

  return {
    enabled: source.enabled === true,
    notifyEmail: String(source.notifyEmail || '').trim(),
    lastNotifiedDate: String(source.lastNotifiedDate || '').trim(),
  };
}

function parseYahrzeitRemindersFromBody(body) {
  return normalizeYahrzeitReminders({
    enabled: body.yahrzeitRemindersEnabled === '1' || body.yahrzeitRemindersEnabled === 'on',
    notifyEmail: body.yahrzeitRemindersEmail,
  });
}

function buildContactMessageEntry(synagogue, person, {
  adminLanguage,
  missed = false,
} = {}) {
  const publicSubmission = normalizePublicSubmission(synagogue.publicSubmission);
  const lang = synagogue.language || 'ru';
  const synagogueName = (synagogue.titles && synagogue.titles[lang])
    || synagogue.name
    || synagogue.title
    || '';
  const t = getTranslator(adminLanguage || synagogue.adminLanguage || lang);
  const contact = normalizePersonContact(person.contact);
  const messageBuilder = missed ? buildMissedYahrzeitMessage : buildYahrzeitMessage;
  const message = messageBuilder({
    synagogueName,
    deceasedName: person.name,
    contact,
    donationUrl: publicSubmission.donationUrl,
    lang,
  });
  const subject = message.split('\n')[0];
  const contactLink = buildContactActionLink(contact, message, subject);

  return {
    ...person,
    contact,
    hasContactDetails: hasContactDetails(contact),
    contactPlatformLabel: contact.platform ? t(`contact_platform_${contact.platform}`) : '',
    preparedMessage: message,
    contactLink,
    photoUrl: person.photo ? `/photos/${person.photo}?w=400` : '',
    boardCardUrl: `/s/${synagogue.slug}/card/${person.id}`,
    tileUrl: `/admin/${synagogue.slug}/yahrzeit/tile/${person.id}.png`,
    missed,
  };
}

function buildYahrzeitPageEntries(synagogue, now = new Date(), adminLanguage) {
  return buildYahrzeitEntries(synagogue, now).map((entry) => (
    buildContactMessageEntry(synagogue, entry, { adminLanguage, missed: false })
  ));
}

function buildYahrzeitWeekMissedEntries(synagogue, now = new Date(), adminLanguage) {
  return getPeopleWithYahrzeitThisWeekMissed(synagogue, now).map((entry) => (
    buildContactMessageEntry(synagogue, entry, { adminLanguage, missed: true })
  ));
}

async function sendDailyYahrzeitReminders({ now = new Date(), dryRun = false } = {}) {
  if (!isEmailConfigured()) {
    return { sent: 0, skipped: 0, reason: 'email_not_configured' };
  }

  const synagogues = await Synagogue.find({}).lean();
  let sent = 0;
  let skipped = 0;

  for (const synagogue of synagogues) {
    const reminders = normalizeYahrzeitReminders(synagogue.yahrzeitReminders);
    if (!reminders.enabled || !reminders.notifyEmail) {
      skipped += 1;
      continue;
    }

    const timezone = resolveSynagogueTimezone(synagogue);
    const dayKey = getDayKeyInTimezone(timezone, now);
    if (reminders.lastNotifiedDate === dayKey) {
      skipped += 1;
      continue;
    }

    const entries = buildYahrzeitEntries(synagogue, now);
    if (entries.length === 0) {
      skipped += 1;
      continue;
    }

    const lang = synagogue.language || 'ru';
    const synagogueName = (synagogue.titles && synagogue.titles[lang])
      || synagogue.name
      || synagogue.title
      || synagogue.slug;
    const publicSubmission = normalizePublicSubmission(synagogue.publicSubmission);
    const subject = buildAdminReminderSubject(synagogueName, entries.length, lang);
    const text = buildAdminReminderBody({
      synagogueName,
      synagogueSlug: synagogue.slug,
      entries,
      donationUrl: publicSubmission.donationUrl,
      lang,
    });

    if (!dryRun) {
      await sendMail({
        to: reminders.notifyEmail,
        subject,
        text,
      });

      await Synagogue.updateOne(
        { slug: synagogue.slug },
        { $set: { 'yahrzeitReminders.lastNotifiedDate': dayKey } },
      );
    }

    sent += 1;
  }

  return { sent, skipped };
}

module.exports = {
  normalizeYahrzeitReminders,
  parseYahrzeitRemindersFromBody,
  buildContactMessageEntry,
  buildYahrzeitPageEntries,
  buildYahrzeitWeekMissedEntries,
  sendDailyYahrzeitReminders,
};
