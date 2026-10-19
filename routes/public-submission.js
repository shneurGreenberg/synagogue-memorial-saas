const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Synagogue = require('../models/Synagogue');
const MemorialPersonInvite = require('../models/MemorialPersonInvite');
const { PHOTOS_DIR } = require('../lib/storage-paths');
const { normalizePublicSubmission } = require('../lib/public-submission');
const {
  getPublicSubmissionTranslator,
  resolvePublicSubmissionLang,
  getContactPlatformOptions,
} = require('../lib/public-submission-i18n');
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
const {
  createPublicSubmissionRateLimiter,
  isAllowedImageUpload,
} = require('../lib/http-security');
const { MAX_UPLOAD_BYTES } = require('../lib/upload-limits');

const router = express.Router();
const OFFICIAL_LOGO_FILENAME = 'kaddish-official-logo.svg';
const publicSubmissionRateLimiter = createPublicSubmissionRateLimiter();

const EMPTY_DECEASED_BLOCK = {
  name: '',
  fatherName: '',
  deathDate: '',
  relationKey: '',
  relationOther: '',
  diedAfterSunset: false,
};

const MIME_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      ensureDir(PHOTOS_DIR);
      cb(null, PHOTOS_DIR);
    },
    filename(req, file, cb) {
      let ext = path.extname(file.originalname).toLowerCase();
      if (!ext && file.mimetype && MIME_EXT[file.mimetype]) {
        ext = MIME_EXT[file.mimetype];
      }
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext || '.jpg'}`);
    },
  }),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter(req, file, cb) {
    if (!isAllowedImageUpload(file)) {
      return cb(new Error('image_only'));
    }
    cb(null, true);
  },
});

function handlePublicPhotoUpload(req, res, next) {
  upload.any()(req, res, (err) => {
    if (!err) {
      return next();
    }

    const lang = resolvePublicSubmissionLang(req.body && req.body.lang, 'ru');
    const inviteToken = req.params.token || '';
    const base = inviteToken
      ? `/s/${req.params.slug}/add-name/invite/${inviteToken}`
      : `/s/${req.params.slug}/add-name`;
    if (err.code === 'LIMIT_FILE_SIZE' || err.message === 'image_only') {
      return res.redirect(`${base}?lang=${lang}&error=upload`);
    }
    return res.status(400).send(err.message);
  });
}

function renderPublicPage(res, view, data) {
  return res.render(view, {
    layout: 'public',
    ...data,
  });
}

async function loadSynagogue(slug) {
  return Synagogue.findOne({ slug }).lean();
}

function buildPageContext(synagogue, lang, options = {}) {
  const pt = getPublicSubmissionTranslator(lang);
  const publicSubmission = normalizePublicSubmission(synagogue.publicSubmission, synagogue.provisioning);
  const communityLogo = synagogue.theme && synagogue.theme.logo;
  const logoBackground = synagogue.theme && synagogue.theme.logoBackground;

  return {
    synagogue,
    lang,
    dir: lang === 'he' ? 'rtl' : 'ltr',
    pt,
    publicSubmission,
    boardUrl: `/s/${synagogue.slug}`,
    formUrl: options.formUrl || `/s/${synagogue.slug}/add-name`,
    successUrl: options.successUrl || `/s/${synagogue.slug}/add-name/success`,
    charityUrl: `/s/${synagogue.slug}/add-name/charity`,
    officialLogoUrl: `/images/${OFFICIAL_LOGO_FILENAME}`,
    communityLogoUrl: communityLogo ? `/images/${communityLogo}` : '',
    communityLogoBackground: logoBackground || '',
    inviteMode: !!options.inviteMode,
    relationOptions: getRelationOptions(lang),
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
      return entries.map((entry) => ({
        name: entry.name || '',
        fatherName: entry.fatherName || '',
        deathDate: entry.deathDateIso || deathDateIsoFromParts(entry.gregorianDateOfDeath),
        relationKey: entry.relationKey || '',
        relationOther: entry.relationOther || '',
        diedAfterSunset: entry.diedAfterSunset,
      }));
    }
  }
  return [{ ...EMPTY_DECEASED_BLOCK }];
}

function buildFormValuesFromQuery(query) {
  return {
    contactName: query.contactName || '',
    contactPhone: query.contactPhone || '',
    contactPlatform: query.contactPlatform || '',
    deceasedNotes: query.deceasedNotes || '',
  };
}

function buildDeceasedRenderList(query) {
  const blocks = deceasedBlocksFromQuery(query);
  return blocks.map((block, index) => ({
    ...block,
    index: String(index),
    displayIndex: index + 1,
  }));
}

function enrichFormRenderContext(context, query) {
  const deceasedList = buildDeceasedRenderList(query);
  return {
    ...context,
    values: buildFormValuesFromQuery(query),
    deceasedList,
    showDeceasedIndex: deceasedList.length > 1,
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
  return '';
}

function appendDeceasedToSearchParams(params, body) {
  const entries = parseDeceasedEntriesFromBody(body);
  entries.forEach((entry, index) => {
    params.set(`deceased[${index}][name]`, entry.name || '');
    params.set(`deceased[${index}][fatherName]`, entry.fatherName || '');
    params.set(`deceased[${index}][relationKey]`, entry.relationKey || '');
    params.set(`deceased[${index}][relationOther]`, entry.relationOther || '');
    if (entry.deathDateIso) {
      params.set(`deceased[${index}][deathDate]`, entry.deathDateIso);
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
  params.set('contactPlatform', contact.platform || '');
  if (body.deceasedNotes) {
    params.set('deceasedNotes', String(body.deceasedNotes).slice(0, 2000));
  }
  appendDeceasedToSearchParams(params, body);
  return res.redirect(`${baseUrl}?${params.toString()}`);
}

async function processPublicSubmissionPost(req, res, options) {
  const { slug, baseUrl, successBaseUrl, requireInviteContact } = options;
  const synagogue = await Synagogue.findOne({ slug });
  if (!synagogue) {
    return res.status(404).send('Synagogue not found');
  }

  const publicSubmission = normalizePublicSubmission(synagogue.publicSubmission, synagogue.provisioning);
  if (!publicSubmission.enabled && !options.inviteMode) {
    return res.redirect(`/s/${slug}/add-name?error=disabled`);
  }

  const lang = resolvePublicSubmissionLang(req.body.lang, synagogue.language);
  const contact = parsePersonContactFromBody(req.body);
  const entries = parseDeceasedEntriesFromBody({ ...req.body, lang });
  const entryError = validateDeceasedEntries(entries);

  if (entryError) {
    return redirectWithFormError(res, baseUrl, lang, entryError, req.body);
  }

  if (requireInviteContact) {
    if (!String(contact.name || '').trim()) {
      return redirectWithFormError(res, baseUrl, lang, 'required', req.body);
    }
    if (!validatePublicSubmissionContact(contact)) {
      return redirectWithFormError(res, baseUrl, lang, 'contact', req.body);
    }
  } else if (!validateRequestSubmitter(contact)) {
    return redirectWithFormError(res, baseUrl, lang, 'required', req.body);
  }

  const beforeCount = (synagogue.personAddRequests || []).length;
  const beforePeople = (synagogue.people || []).length;

  await pushPersonAddRequests(slug, entries, contact, req.files || []);

  const after = await Synagogue.findOne({ slug }).lean();
  const addedRequests = (after.personAddRequests || []).length - beforeCount;
  const addedPeople = (after.people || []).length - beforePeople;

  if (addedPeople > 0) {
    throw new Error('public_submission_must_not_add_to_board');
  }
  if (addedRequests !== entries.length) {
    throw new Error('person_add_request_count_mismatch');
  }

  const count = entries.length;
  const params = new URLSearchParams({
    lang,
    sent: 'request',
    count: String(count),
  });
  if (count === 1 && entries[0].name) {
    params.set('name', entries[0].name);
  }
  return res.redirect(`${successBaseUrl}?${params.toString()}`);
}

async function loadPersonInvite(slug, token) {
  const invite = await MemorialPersonInvite.findOne({
    token: String(token || '').trim(),
    synagogueSlug: String(slug || '').trim(),
  });
  if (!invite || !invite.isUsable()) {
    return null;
  }
  return invite;
}

router.get('/:slug/add-name', async (req, res) => {
  try {
    const synagogue = await loadSynagogue(req.params.slug);
    if (!synagogue) {
      return res.status(404).send('Synagogue not found');
    }

    const lang = resolvePublicSubmissionLang(req.query.lang, synagogue.language);
    const context = buildPageContext(synagogue, lang);

    if (!context.publicSubmission.enabled) {
      return renderPublicPage(res, 'public/add-name-disabled', context);
    }

    return renderPublicPage(res, 'public/add-name', enrichFormRenderContext(context, req.query));
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

router.post('/:slug/add-name', publicSubmissionRateLimiter, async (req, res) => {
  try {
    return processPublicSubmissionPost(req, res, {
      slug: req.params.slug,
      baseUrl: `/s/${req.params.slug}/add-name`,
      successBaseUrl: `/s/${req.params.slug}/add-name/success`,
      requireInviteContact: false,
    });
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

router.get('/:slug/add-name/invite/:token', async (req, res) => {
  try {
    const synagogue = await loadSynagogue(req.params.slug);
    if (!synagogue) {
      return res.status(404).send('Synagogue not found');
    }

    const invite = await loadPersonInvite(req.params.slug, req.params.token);
    const lang = resolvePublicSubmissionLang(req.query.lang, synagogue.language);
    const formUrl = `/s/${synagogue.slug}/add-name/invite/${req.params.token}`;
    const context = buildPageContext(synagogue, lang, {
      formUrl,
      successUrl: `${formUrl}/success`,
      inviteMode: true,
    });

    if (!invite) {
      return renderPublicPage(res, 'public/add-name-invite-invalid', {
        ...context,
        inviteInvalid: true,
      });
    }

    return renderPublicPage(res, 'public/add-name-invite', {
      ...enrichFormRenderContext(context, req.query),
      inviteToken: invite.token,
      contactPlatformOptions: getContactPlatformOptions(lang, { excludeEmail: true }),
    });
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

router.post('/:slug/add-name/invite/:token', publicSubmissionRateLimiter, handlePublicPhotoUpload, async (req, res) => {
  try {
    const invite = await loadPersonInvite(req.params.slug, req.params.token);
    if (!invite) {
      return res.status(403).send('Invite link is not valid');
    }

    const formUrl = `/s/${req.params.slug}/add-name/invite/${req.params.token}`;
    return processPublicSubmissionPost(req, res, {
      slug: req.params.slug,
      baseUrl: formUrl,
      successBaseUrl: `${formUrl}/success`,
      requireInviteContact: true,
      inviteMode: true,
    });
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

router.get('/:slug/add-name/invite/:token/success', async (req, res) => {
  try {
    const synagogue = await loadSynagogue(req.params.slug);
    if (!synagogue) {
      return res.status(404).send('Synagogue not found');
    }

    const lang = resolvePublicSubmissionLang(req.query.lang, synagogue.language);
    const formUrl = `/s/${synagogue.slug}/add-name/invite/${req.params.token}`;
    const context = buildPageContext(synagogue, lang, {
      formUrl,
      successUrl: `${formUrl}/success`,
      inviteMode: true,
    });

    return renderPublicPage(res, 'public/add-name-success', {
      ...context,
      submittedName: String(req.query.name || '').trim(),
      successKind: 'request',
      submittedCount: parseInt(req.query.count, 10) || 1,
      isMultiRequest: (parseInt(req.query.count, 10) || 1) > 1,
    });
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

router.get('/:slug/add-name/success', async (req, res) => {
  try {
    const synagogue = await loadSynagogue(req.params.slug);
    if (!synagogue) {
      return res.status(404).send('Synagogue not found');
    }

    const lang = resolvePublicSubmissionLang(req.query.lang, synagogue.language);
    const context = buildPageContext(synagogue, lang);

    return renderPublicPage(res, 'public/add-name-success', {
      ...context,
      submittedName: String(req.query.name || '').trim(),
      successKind: req.query.sent === 'request' ? 'request' : 'added',
      submittedCount: parseInt(req.query.count, 10) || 1,
      isMultiRequest: (parseInt(req.query.count, 10) || 1) > 1,
    });
  } catch (err) {
    return res.status(500).send(err.message);
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
    return res.status(500).send(err.message);
  }
});

module.exports = router;
module.exports.processPublicSubmissionPost = processPublicSubmissionPost;
module.exports.pushPersonAddRequests = pushPersonAddRequests;
