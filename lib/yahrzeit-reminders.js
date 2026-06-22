const Synagogue = require('../models/Synagogue');
const { normalizePublicSubmission } = require('./public-submission');
const { buildYahrzeitEntries, getDayKeyInTimezone, resolveSynagogueTimezone } = require('./yahrzeit');
const { buildYahrzeitMessage, buildAdminReminderSubject, buildAdminReminderBody } = require('./yahrzeit-messages');
const { buildContactActionLink } = require('./contact-links');
const { normalizePersonContact } = require('./person-contact');
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

function buildYahrzeitPageEntries(synagogue, now = new Date(), adminLanguage) {
  const publicSubmission = normalizePublicSubmission(synagogue.publicSubmission);
  const lang = synagogue.language || 'ru';
  const synagogueName = (synagogue.titles && synagogue.titles[lang])
    || synagogue.name
    || synagogue.title
    || '';
  const t = getTranslator(adminLanguage || synagogue.adminLanguage || lang);

  return buildYahrzeitEntries(synagogue, now).map((entry) => {
    const contact = normalizePersonContact(entry.contact);
    const message = buildYahrzeitMessage({
      synagogueName,
      deceasedName: entry.name,
      contact,
      donationUrl: publicSubmission.donationUrl,
      lang,
    });
    const subject = buildYahrzeitMessage({
      synagogueName,
      deceasedName: entry.name,
      contact,
      donationUrl: '',
      lang,
    }).split('\n')[0];

    return {
      ...entry,
      contact,
      contactPlatformLabel: t(`contact_platform_${contact.platform}`),
      preparedMessage: message,
      contactLink: buildContactActionLink(contact, message, subject),
      photoUrl: entry.photo ? `/photos/${entry.photo}?w=400` : '',
    };
  });
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
  buildYahrzeitPageEntries,
  sendDailyYahrzeitReminders,
};
