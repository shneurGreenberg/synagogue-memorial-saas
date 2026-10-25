const express = require('express');
const Synagogue = require('../models/Synagogue');
const { normalizePublicSubmission, parseDonationUrl } = require('../lib/public-submission');
const {
  getPublicSubmissionTranslator,
  resolvePublicSubmissionLang,
  getMonthOptions,
} = require('../lib/public-submission-i18n');
const {
  resolvePublicSubmissionPhonePlaceholder,
  buildPhoneFieldContext,
} = require('../lib/public-submission-phone');
const { buildPublicBoardThemeRender } = require('../lib/public-board-theme');
const { splitDeceasedDisplayName } = require('../lib/public-deceased-name');
const {
  parseDataConsentFromBody,
  validateDataConsent,
  consentTimestamp,
} = require('../lib/public-submission-consent');
const { isHoneypotTripped, HONEYPOT_FIELD } = require('../lib/public-submission-honeypot');
const { getRelationOptions } = require('../lib/submission-relation');
const {
  parsePersonContactFromBody,
  validatePublicSubmissionContact,
} = require('../lib/person-contact');
const { validateRequestSubmitter } = require('../lib/person-add-request');
const {
  parseDeceasedEntriesFromBody,
  validateDeceasedEntries,
} = require('../lib/public-submission-form');
const { pushPersonAddRequests } = require('../lib/public-submission-persist');
const { createPublicSubmissionRateLimiter, publicErrorMessage } = require('../lib/http-security');
const { invalidateBoardCache } = require('../lib/board-cache');
const { invalidateAdminSynagogueCache } = require('../lib/admin-synagogue-load');
const { syncAutoDonationQrAfterUrlChange } = require('../lib/default-community-qr');
const { formatDdMmYyyy, formatDdMmYyyyFromIso } = require('../lib/dd-mm-yyyy-date');
const {
  formatDeceasedCardBadge,
  formatPublicSubmitLabel,
} = require('../lib/public-add-name-labels');

const router = express.Router();
const OFFICIAL_LOGO_FILENAME = 'kaddish-official-logo.svg';
const publicSubmissionRateLimiter = createPublicSubmissionRateLimiter();

const EMPTY_DECEASED_BLOCK = {
  name: '',
  surname: '',
  firstName: '',
  fatherName: '',
  deathDate: '',
  deathDateDisplay: '',
  deathDay: '',
  deathMonth: '',
  deathYear: '',
  relationKey: '',
  relationOther: '',
  deceasedGender: 'male',
  diedAfterSunset: false,
};

function renderPublicPage(res, view, data) {
  return res.render(view, {
    layout: 'public',
    ...data,
  });
}

async function loadSynagogue(slug) {
  return Synagogue.findOne({ slug }).lean();
}

function redirectLegacyInviteToAddName(req, res) {
  const slug = req.params.slug;
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  return res.redirect(302, `/s/${slug}/add-name${query}`);
}

function buildPageContext(synagogue, lang, options = {}) {
  const pt = getPublicSubmissionTranslator(lang);
  const publicSubmission = normalizePublicSubmission(synagogue.publicSubmission, synagogue.provisioning);
  const communityLogo = synagogue.theme && synagogue.theme.logo;
  const logoBackground = synagogue.theme && synagogue.theme.logoBackground;
  const themeRender = buildPublicBoardThemeRender(synagogue);

  return {
    synagogue,
    lang,
    dir: lang === 'he' ? 'rtl' : 'ltr',
    pt,
    publicSubmission,
    ...themeRender,
    boardUrl: `/s/${synagogue.slug}`,
    formUrl: options.formUrl || `/s/${synagogue.slug}/add-name`,
    successUrl: options.successUrl || `/s/${synagogue.slug}/add-name/success`,
    charityUrl: `/s/${synagogue.slug}/add-name/charity`,
    officialLogoUrl: `/images/${OFFICIAL_LOGO_FILENAME}`,
    communityLogoUrl: communityLogo ? `/images/${communityLogo}` : '',
    communityLogoBackground: logoBackground || '',
    inviteMode: false,
    relationOptions: getRelationOptions(lang),
    monthOptions: getMonthOptions(lang),
    phonePlaceholder: resolvePublicSubmissionPhonePlaceholder(synagogue.language, lang),
    honeypotField: HONEYPOT_FIELD,
    emptyDeceasedBlock: EMPTY_DECEASED_BLOCK,
  };
}

function deathDateIsoFromParts(death) {
  if (!death || !death.year || !death.month || !death.date) {
    return '';
  }
  const month = String(death.month).padStart(2, '0');
  const date = String(death.date).padStart(2, '0');
  return `${death.year}-${month}-${date}`;
}

function deceasedBlocksFromQuery(query) {
  const body = { ...query, lang: query.lang };
  if (query.deceased || query.name) {
    const entries = parseDeceasedEntriesFromBody(body);
    if (entries.length) {
      return entries.map((entry) => {
        const iso = entry.deathDateIso || deathDateIsoFromParts(entry.gregorianDateOfDeath);
        const deathDateDisplay = formatDdMmYyyy(entry.gregorianDateOfDeath)
          || formatDdMmYyyyFromIso(iso)
          || (entry.deathDay && entry.deathMonth && entry.deathYear
            ? formatDdMmYyyy({
              date: Number(entry.deathDay),
              month: Number(entry.deathMonth),
              year: Number(entry.deathYear),
            })
            : '');
        const nameParts = splitDeceasedDisplayName(entry.name || '');
        return {
        name: entry.name || '',
        surname: entry.rawFields && entry.rawFields.surname
          ? String(entry.rawFields.surname).trim()
          : nameParts.surname,
        firstName: entry.rawFields && entry.rawFields.firstName
          ? String(entry.rawFields.firstName).trim()
          : nameParts.firstName,
        fatherName: entry.fatherName || '',
        deathDate: iso,
        deathDateDisplay,
        deathDay: entry.deathDay || (entry.gregorianDateOfDeath ? String(entry.gregorianDateOfDeath.date) : ''),
        deathMonth: entry.deathMonth || (entry.gregorianDateOfDeath ? String(entry.gregorianDateOfDeath.month) : ''),
        deathYear: entry.deathYear || (entry.gregorianDateOfDeath ? String(entry.gregorianDateOfDeath.year) : ''),
        relationKey: entry.relationKey || '',
        relationOther: entry.relationOther || '',
        deceasedGender: entry.deceasedGender || 'male',
        diedAfterSunset: entry.diedAfterSunset,
      };
      });
    }
  }
  return [{ ...EMPTY_DECEASED_BLOCK }];
}

function buildFormValuesFromQuery(query, synagogue) {
  const phoneFields = buildPhoneFieldContext(synagogue, query);
  return {
    contactName: query.contactName || '',
    contactPhone: phoneFields.contactPhoneE164 || query.contactPhone || '',
    contactPhoneDial: phoneFields.contactPhoneDial,
    contactPhoneNational: phoneFields.contactPhoneNational,
    contactPlatform: query.contactPlatform || '',
    deceasedNotes: query.deceasedNotes || '',
  };
}

function buildDeceasedRenderList(query, lang) {
  const blocks = deceasedBlocksFromQuery(query);
  return blocks.map((block, index) => ({
    ...block,
    index: String(index),
    displayIndex: index + 1,
    deceasedBadgeLabel: formatDeceasedCardBadge(lang, index + 1),
  }));
}

function enrichFormRenderContext(context, query) {
  const lang = context.lang;
  const deceasedList = buildDeceasedRenderList(query, lang);
  const submitVariant = context.inviteMode ? { submitKey: 'submit_invite' } : {};
  return {
    ...context,
    values: buildFormValuesFromQuery(query, context.synagogue),
    phoneDialOptions: buildPhoneFieldContext(context.synagogue, query).phoneDialOptions,
    deceasedList,
    submitButtonLabel: formatPublicSubmitLabel(lang, deceasedList.length, submitVariant),
    deceasedBadgePrefix: context.pt('deceased_block_title'),
    deceasedCountUnit: context.pt('deceased_count_unit'),
    emptyDeceasedTemplateBlock: {
      ...EMPTY_DECEASED_BLOCK,
      deceasedBadgeLabel: formatDeceasedCardBadge(lang, 1),
    },
    error: query.error || '',
    errorMessage: resolveErrorMessage(context.pt, query.error),
  };
}

function resolveErrorMessage(pt, errorCode) {
  if (errorCode === 'required') {
    return pt('required_error');
  }
  if (errorCode === 'father') {
    return pt('father_required_error');
  }
  if (errorCode === 'contact') {
    return pt('contact_required_error');
  }
  if (errorCode === 'date') {
    return pt('invalid_date_error');
  }
  if (errorCode === 'upload') {
    return pt('upload_error');
  }
  if (errorCode === 'consent') {
    return pt('consent_required_error');
  }
  return '';
}

function appendDeceasedToSearchParams(params, body) {
  const entries = parseDeceasedEntriesFromBody(body);
  entries.forEach((entry, index) => {
    const parts = splitDeceasedDisplayName(entry.name || '');
    params.set(`deceased[${index}][surname]`, parts.surname);
    params.set(`deceased[${index}][firstName]`, parts.firstName);
    params.set(`deceased[${index}][name]`, entry.name || '');
    params.set(`deceased[${index}][fatherName]`, entry.fatherName || '');
    params.set(`deceased[${index}][relationKey]`, entry.relationKey || '');
    params.set(`deceased[${index}][relationOther]`, entry.relationOther || '');
    const displayDate = formatDdMmYyyy(entry.gregorianDateOfDeath)
      || formatDdMmYyyyFromIso(entry.deathDateIso);
    if (displayDate) {
      params.set(`deceased[${index}][deathDate]`, displayDate);
    }
    if (entry.deceasedGender) {
      params.set(`deceased[${index}][deceasedGender]`, entry.deceasedGender);
    }
    params.set(
      `deceased[${index}][diedAfterSunset]`,
      entry.diedAfterSunset ? 'after' : 'before',
    );
  });
}

function redirectWithFormError(res, baseUrl, lang, errorCode, body) {
  const params = new URLSearchParams({ lang, error: errorCode });
  const contact = parsePersonContactFromBody(body);
  params.set('contactName', contact.name || '');
  params.set('contactPhone', contact.phone || '');
  if (body.contactPhoneDial) {
    params.set('contactPhoneDial', String(body.contactPhoneDial));
  }
  if (body.contactPhoneNational) {
    params.set('contactPhoneNational', String(body.contactPhoneNational));
  }
  params.set('contactPlatform', contact.platform || '');
  if (body.deceasedNotes) {
    params.set('deceasedNotes', String(body.deceasedNotes).slice(0, 2000));
  }
  appendDeceasedToSearchParams(params, body);
  return res.redirect(`${baseUrl}?${params.toString()}`);
}

function redirectToThankYou(res, successBaseUrl, lang, entries) {
  const count = entries.length;
  const params = new URLSearchParams({
    lang,
    sent: 'request',
    count: String(count),
  });
  if (count === 1 && entries[0].name) {
    params.set('name', entries[0].name);
  }
  entries.forEach((entry, index) => {
    if (entry.name) {
      params.set(`n${index}`, entry.name);
    }
  });
  return res.redirect(`${successBaseUrl}?${params.toString()}`);
}

async function processPublicSubmissionPost(req, res, options) {
  const { slug, baseUrl, successBaseUrl } = options;
  const synagogue = await Synagogue.findOne({ slug });
  if (!synagogue) {
    return res.status(404).send('Synagogue not found');
  }

  const lang = resolvePublicSubmissionLang(req.body.lang, synagogue.language);

  if (isHoneypotTripped(req.body)) {
    const entries = parseDeceasedEntriesFromBody({ ...req.body, lang });
    return redirectToThankYou(res, successBaseUrl, lang, entries.length ? entries : [{ name: '' }]);
  }

  const contact = parsePersonContactFromBody(req.body);
  const entries = parseDeceasedEntriesFromBody({ ...req.body, lang });
  const entryError = validateDeceasedEntries(entries);

  if (entryError) {
    return redirectWithFormError(res, baseUrl, lang, entryError, req.body);
  }

  if (!validateRequestSubmitter(contact)) {
    return redirectWithFormError(res, baseUrl, lang, 'required', req.body);
  }

  const dataConsent = parseDataConsentFromBody(req.body);
  if (!validateDataConsent(dataConsent)) {
    return redirectWithFormError(res, baseUrl, lang, 'consent', req.body);
  }

  const beforeCount = (synagogue.personAddRequests || []).length;
  const beforePeople = (synagogue.people || []).length;

  await pushPersonAddRequests(slug, entries, contact, req.files || [], {
    dataConsent: true,
    consentAt: consentTimestamp(),
  });

  const after = await Synagogue.findOne({ slug }).lean();
  const addedRequests = (after.personAddRequests || []).length - beforeCount;
  const addedPeople = (after.people || []).length - beforePeople;

  if (addedPeople > 0) {
    throw new Error('public_submission_must_not_add_to_board');
  }
  if (addedRequests !== entries.length) {
    throw new Error('person_add_request_count_mismatch');
  }

  return redirectToThankYou(res, successBaseUrl, lang, entries);
}

router.get('/:slug/add-name', async (req, res) => {
  try {
    const synagogue = await loadSynagogue(req.params.slug);
    if (!synagogue) {
      return res.status(404).send('Synagogue not found');
    }

    const lang = resolvePublicSubmissionLang(req.query.lang, synagogue.language);
    const context = buildPageContext(synagogue, lang);

    return renderPublicPage(res, 'public/add-name', enrichFormRenderContext(context, req.query));
  } catch (err) {
    return res.status(500).send(publicErrorMessage(err));
  }
});

router.post('/:slug/add-name', publicSubmissionRateLimiter, async (req, res) => {
  try {
    return processPublicSubmissionPost(req, res, {
      slug: req.params.slug,
      baseUrl: `/s/${req.params.slug}/add-name`,
      successBaseUrl: `/s/${req.params.slug}/add-name/success`,
    });
  } catch (err) {
    return res.status(500).send(publicErrorMessage(err));
  }
});

router.get('/:slug/add-name/invite/:token', redirectLegacyInviteToAddName);

router.post('/:slug/add-name/invite/:token', publicSubmissionRateLimiter, redirectLegacyInviteToAddName);

router.get('/:slug/add-name/invite/:token/success', redirectLegacyInviteToAddName);

router.get('/:slug/add-name/success', async (req, res) => {
  try {
    const synagogue = await loadSynagogue(req.params.slug);
    if (!synagogue) {
      return res.status(404).send('Synagogue not found');
    }

    const lang = resolvePublicSubmissionLang(req.query.lang, synagogue.language);
    const context = buildPageContext(synagogue, lang);

    const submittedCount = parseInt(req.query.count, 10) || 1;
    const submittedNames = [];
    for (let index = 0; index < submittedCount; index += 1) {
      const value = String(req.query[`n${index}`] || '').trim();
      if (value) {
        submittedNames.push(value);
      }
    }
    if (!submittedNames.length && req.query.name) {
      submittedNames.push(String(req.query.name).trim());
    }

    return renderPublicPage(res, 'public/add-name-success', {
      ...context,
      submittedName: String(req.query.name || '').trim(),
      submittedNames,
      successKind: 'request',
      submittedCount,
      isMultiRequest: submittedCount > 1,
      shareUrl: `${req.protocol}://${req.get('host')}/s/${synagogue.slug}/add-name?lang=${lang}`,
    });
  } catch (err) {
    return res.status(500).send(publicErrorMessage(err));
  }
});

function requireAdminForCommunitySlug(req, res, next) {
  const slug = req.params.slug;
  if (!req.session?.adminSlug || req.session.adminSlug !== slug) {
    return res.redirect('/admin/login');
  }
  return next();
}

async function saveDonationUrlForSlug(slug, rawUrl) {
  const donationUrl = parseDonationUrl(rawUrl);
  await Synagogue.updateOne(
    { slug },
    { $set: { 'publicSubmission.donationUrl': donationUrl } },
  );
  const synagogue = await Synagogue.findOne({ slug });
  if (!synagogue) {
    return;
  }
  const donationQrImage = await syncAutoDonationQrAfterUrlChange(synagogue);
  if (donationQrImage) {
    await Synagogue.updateOne(
      { slug },
      { $set: { 'publicSubmission.donationQrImage': donationQrImage } },
    );
  }
  invalidateBoardCache(slug);
  invalidateAdminSynagogueCache(slug);
}

router.get('/:slug/donation-setup', requireAdminForCommunitySlug, async (req, res) => {
  try {
    const synagogue = await loadSynagogue(req.params.slug);
    if (!synagogue) {
      return res.status(404).send('Synagogue not found');
    }

    const lang = resolvePublicSubmissionLang(req.query.lang, synagogue.language);
    const context = buildPageContext(synagogue, lang);

    return renderPublicPage(res, 'public/donation-setup', context);
  } catch (err) {
    return res.status(500).send(publicErrorMessage(err));
  }
});

router.post('/:slug/donation-setup', requireAdminForCommunitySlug, async (req, res) => {
  try {
    const slug = req.params.slug;
    const synagogue = await Synagogue.findOne({ slug });
    if (!synagogue) {
      return res.status(404).send('Synagogue not found');
    }

    await saveDonationUrlForSlug(slug, req.body.donationUrl);
    return res.redirect(`/admin/${slug}/dashboard?saved=1`);
  } catch (err) {
    return res.status(500).send(publicErrorMessage(err));
  }
});

router.get('/:slug/add-name/charity', async (req, res) => {
  try {
    const synagogue = await loadSynagogue(req.params.slug);
    if (!synagogue) {
      return res.status(404).send('Synagogue not found');
    }

    const lang = resolvePublicSubmissionLang(req.query.lang, synagogue.language);
    const context = buildPageContext(synagogue, lang);

    return renderPublicPage(res, 'public/add-name-charity', context);
  } catch (err) {
    return res.status(500).send(publicErrorMessage(err));
  }
});

module.exports = router;
module.exports.processPublicSubmissionPost = processPublicSubmissionPost;
module.exports.pushPersonAddRequests = pushPersonAddRequests;
module.exports.redirectLegacyInviteToAddName = redirectLegacyInviteToAddName;
