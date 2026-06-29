const { normalizePublicSubmission } = require('./public-submission');
const { buildYahrzeitEntries, getPeopleWithYahrzeitThisWeekMissed, getDayKeyInTimezone, resolveSynagogueTimezone } = require('./yahrzeit');
const { buildYahrzeitMessage, buildMissedYahrzeitMessage, buildAdminReminderSubject, buildAdminReminderBody } = require('./yahrzeit-messages');
const { buildContactActionLink } = require('./contact-links');
const {
  normalizePersonContact,
  getPersonContacts,
  hasContactDetails,
  hasContactInfo,
} = require('./person-contact');
const { sendMail, isEmailConfigured } = require('./email');
const { getTranslator } = require('./admin-translations');

function normalizeYahrzeitReminders(raw) {
  const source = raw || {};

  return {
    enabled: source.enabled === true,
    includeHebrewYahrzeit: source.includeHebrewYahrzeit !== false,
    notifyEmail: String(source.notifyEmail || '').trim(),
    lastNotifiedDate: String(source.lastNotifiedDate || '').trim(),
  };
}

function parseYahrzeitRemindersFromBody(body) {
  const source = body || {};
  const parsed = {
    enabled: false,
    includeHebrewYahrzeit: true,
    notifyEmail: '',
  };

  if ('yahrzeitRemindersEnabled' in source) {
    parsed.enabled = source.yahrzeitRemindersEnabled === '1' || source.yahrzeitRemindersEnabled === 'on';
  }
  if ('yahrzeitRemindersIncludeHebrew' in source) {
    parsed.includeHebrewYahrzeit = source.yahrzeitRemindersIncludeHebrew === '1' || source.yahrzeitRemindersIncludeHebrew === 'on';
  }
  if ('yahrzeitRemindersEmail' in source) {
    parsed.notifyEmail = source.yahrzeitRemindersEmail;
  }

  return normalizeYahrzeitReminders(parsed);
}

function resolveYahrzeitReminderOptions(synagogue) {
  const reminders = normalizeYahrzeitReminders(synagogue && synagogue.yahrzeitReminders);
  return {
    includeHebrewYahrzeit: reminders.includeHebrewYahrzeit,
  };
}

function resolveYahrzeitKind(entry) {
  const hebrew = !!entry.yahrzeitIsHebrewToday;
  const gregorian = !!entry.yahrzeitIsGregorianToday;

  if (hebrew && gregorian) {
    return 'both';
  }
  if (hebrew) {
    return 'hebrew';
  }
  if (gregorian) {
    return 'gregorian';
  }
  return '';
}

function buildContactEntryForPerson(synagogue, person, contact, {
  adminLanguage,
  missed = false,
  contactIndex = 0,
} = {}) {
  const publicSubmission = normalizePublicSubmission(synagogue.publicSubmission, synagogue.provisioning);
  const lang = synagogue.language || 'ru';
  const synagogueName = (synagogue.titles && synagogue.titles[lang])
    || synagogue.name
    || synagogue.title
    || '';
  const t = getTranslator(adminLanguage || synagogue.adminLanguage || lang);
  const normalized = normalizePersonContact(contact);
  const messageBuilder = missed ? buildMissedYahrzeitMessage : buildYahrzeitMessage;
  const message = messageBuilder({
    synagogueName,
    deceasedName: person.name,
    contact: normalized,
    donationUrl: publicSubmission.donationUrl,
    lang,
  });
  const subject = message.split('\n')[0];
  const contactLink = buildContactActionLink(normalized, message, subject);

  return {
    contact: normalized,
    contactIndex,
    hasContactDetails: hasContactDetails(normalized),
    hasContactInfo: hasContactInfo(normalized),
    contactPlatformLabel: normalized.platform ? t(`contact_platform_${normalized.platform}`) : '',
    preparedMessage: message,
    contactLink,
    canSend: !!contactLink,
  };
}

function buildContactMessageEntry(synagogue, person, {
  adminLanguage,
  missed = false,
} = {}) {
  const contacts = getPersonContacts(person);
  const contactEntries = contacts.map((contact, index) => (
    buildContactEntryForPerson(synagogue, person, contact, {
      adminLanguage,
      missed,
      contactIndex: index,
    })
  ));
  const primary = contactEntries[0] || buildContactEntryForPerson(synagogue, person, {}, {
    adminLanguage,
    missed,
    contactIndex: 0,
  });
  const yahrzeitKind = resolveYahrzeitKind(person);
  const t = getTranslator(adminLanguage || synagogue.adminLanguage || synagogue.language || 'ru');

  return {
    ...person,
    contacts: contactEntries,
    contact: primary.contact,
    hasContactDetails: contactEntries.some((entry) => entry.hasContactDetails),
    yahrzeitKind,
    yahrzeitKindLabel: yahrzeitKind === 'hebrew'
      ? t('yahrzeit_hebrew_today')
      : yahrzeitKind === 'gregorian'
        ? t('yahrzeit_gregorian_today')
        : yahrzeitKind === 'both'
          ? t('yahrzeit_both_today')
          : '',
    contactPlatformLabel: primary.contactPlatformLabel,
    preparedMessage: primary.preparedMessage,
    contactLink: primary.contactLink,
    photoUrl: person.photo ? `/photos/${person.photo}?w=400` : '',
    boardCardUrl: `/s/${synagogue.slug}/card/${person.id}`,
    tileUrl: `/s/${synagogue.slug}/card/${person.id}?export=1`,
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
    const publicSubmission = normalizePublicSubmission(synagogue.publicSubmission, synagogue.provisioning);
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
  resolveYahrzeitReminderOptions,
  resolveYahrzeitKind,
  buildContactMessageEntry,
  buildYahrzeitPageEntries,
  buildYahrzeitWeekMissedEntries,
  sendDailyYahrzeitReminders,
};
