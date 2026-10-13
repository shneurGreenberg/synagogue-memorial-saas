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
  getMonthOptions,
  getContactPlatformOptions,
} = require('../lib/public-submission-i18n');
const {
  parsePersonContactFromBody,
  validatePublicSubmissionContact,
} = require('../lib/person-contact');
const {
  buildPersonAddRequest,
  validateRequestSubmitter,
} = require('../lib/person-add-request');
const { appendDeceasedPerson, photoCropFromBody } = require('../lib/public-submission-deceased');
const { optimizeUploadedImage } = require('../lib/image-optimize');
const {
  createPublicSubmissionRateLimiter,
  isAllowedImageUpload,
} = require('../lib/http-security');
const { MAX_UPLOAD_BYTES } = require('../lib/upload-limits');

const router = express.Router();
const OFFICIAL_LOGO_FILENAME = 'kaddish-official-logo.svg';
const publicSubmissionRateLimiter = createPublicSubmissionRateLimiter();

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
      cb(null, `${Date.now()}${ext || '.jpg'}`);
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
  upload.single('photo')(req, res, (err) => {
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

function parseDeathDate(body) {
  const month = parseInt(body.month, 10);
  const date = parseInt(body.date, 10);
  const year = parseInt(body.year, 10);

  if (!Number.isFinite(month) || !Number.isFinite(date) || !Number.isFinite(year)) {
    return null;
  }

  if (month < 1 || month > 12 || date < 1 || date > 31 || year < 1800 || year > 2100) {
    return null;
  }

  const probe = new Date(year, month - 1, date);
  if (
    probe.getFullYear() !== year
    || probe.getMonth() !== month - 1
    || probe.getDate() !== date
  ) {
    return null;
  }

  return { month, date, year };
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
  };
}

function buildFormValuesFromQuery(query) {
  return {
    name: query.name || '',
    month: query.month || '',
    date: query.date || '',
    year: query.year || '',
    contactName: query.contactName || '',
    contactPhone: query.contactPhone || '',
    contactEmail: query.contactEmail || '',
    contactPlatform: query.contactPlatform || '',
    relation: query.relation || '',
    deceasedNotes: query.deceasedNotes || '',
  };
}

function resolveErrorMessage(pt, errorCode) {
  if (errorCode === 'required') {
    return pt('required_error');
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
    const { publicSubmission } = context;

    if (!publicSubmission.enabled) {
      return renderPublicPage(res, 'public/add-name-disabled', context);
    }

    return renderPublicPage(res, 'public/add-name', {
      ...context,
      monthOptions: getMonthOptions(lang),
      error: req.query.error || '',
      values: buildFormValuesFromQuery(req.query),
      errorMessage: resolveErrorMessage(context.pt, req.query.error),
    });
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

router.post('/:slug/add-name', publicSubmissionRateLimiter, async (req, res) => {
  try {
    const synagogue = await Synagogue.findOne({ slug: req.params.slug });
    if (!synagogue) {
      return res.status(404).send('Synagogue not found');
    }

    const publicSubmission = normalizePublicSubmission(synagogue.publicSubmission, synagogue.provisioning);
    if (!publicSubmission.enabled) {
      return res.redirect(`/s/${req.params.slug}/add-name?error=disabled`);
    }

    const deceasedName = String(req.body.name || '').trim().slice(0, 120);
    const deathDate = parseDeathDate(req.body);
    const contact = parsePersonContactFromBody(req.body);
    const relation = String(req.body.relation || '').trim().slice(0, 120);
    const deceasedNotes = String(req.body.deceasedNotes || '').trim().slice(0, 2000);
    const lang = resolvePublicSubmissionLang(req.body.lang, synagogue.language);

    if (!deceasedName || !validateRequestSubmitter(contact)) {
      const params = new URLSearchParams({
        lang,
        error: 'required',
        name: deceasedName,
        relation,
        deceasedNotes,
        month: req.body.month || '',
        date: req.body.date || '',
        year: req.body.year || '',
        contactName: contact.name,
        contactPhone: contact.phone,
        contactEmail: contact.email,
      });
      return res.redirect(`/s/${req.params.slug}/add-name?${params.toString()}`);
    }

    if (!deathDate) {
      const params = new URLSearchParams({
        lang,
        error: 'date',
        name: deceasedName,
        relation,
        deceasedNotes,
        month: req.body.month || '',
        date: req.body.date || '',
        year: req.body.year || '',
        contactName: contact.name,
        contactPhone: contact.phone,
        contactEmail: contact.email,
      });
      return res.redirect(`/s/${req.params.slug}/add-name?${params.toString()}`);
    }

    const request = buildPersonAddRequest({
      submitter: contact,
      relation,
      deceasedName,
      deceasedNotes,
      gregorianDateOfDeath: deathDate,
    });

    await Synagogue.updateOne(
      { slug: req.params.slug },
      { $push: { personAddRequests: request } },
    );

    return res.redirect(`/s/${req.params.slug}/add-name/success?lang=${lang}&name=${encodeURIComponent(deceasedName)}&sent=request`);
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
      ...context,
      inviteToken: invite.token,
      monthOptions: getMonthOptions(lang),
      error: req.query.error || '',
      values: buildFormValuesFromQuery(req.query),
      errorMessage: resolveErrorMessage(context.pt, req.query.error),
      contactPlatformOptions: getContactPlatformOptions(lang),
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

    const synagogue = await Synagogue.findOne({ slug: req.params.slug });
    if (!synagogue) {
      return res.status(404).send('Synagogue not found');
    }

    const name = String(req.body.name || '').trim().slice(0, 120);
    const deathDate = parseDeathDate(req.body);
    const contact = parsePersonContactFromBody(req.body);
    const lang = resolvePublicSubmissionLang(req.body.lang, synagogue.language);
    const formUrl = `/s/${req.params.slug}/add-name/invite/${req.params.token}`;

    if (!name || !String(contact.name || '').trim()) {
      return res.redirect(`${formUrl}?lang=${lang}&error=required&name=${encodeURIComponent(name)}`);
    }

    if (!validatePublicSubmissionContact(contact)) {
      const params = new URLSearchParams({
        lang,
        error: 'contact',
        name,
        month: req.body.month || '',
        date: req.body.date || '',
        year: req.body.year || '',
        contactName: contact.name,
        contactPhone: contact.phone,
        contactEmail: contact.email,
        contactPlatform: contact.platform,
      });
      return res.redirect(`${formUrl}?${params.toString()}`);
    }

    if (!deathDate) {
      const params = new URLSearchParams({
        lang,
        error: 'date',
        name,
        month: req.body.month || '',
        date: req.body.date || '',
        year: req.body.year || '',
      });
      return res.redirect(`${formUrl}?${params.toString()}`);
    }

    let photoFilename = '';
    if (req.file) {
      photoFilename = await optimizeUploadedImage(req.file.path, 'photo');
    }
    const photoCrop = photoFilename ? photoCropFromBody(req.body) : undefined;

    await appendDeceasedPerson(req.params.slug, {
      name,
      deathDate,
      contact,
      photoFilename,
      photoCrop,
    });

    return res.redirect(`${formUrl}/success?lang=${lang}&name=${encodeURIComponent(name)}`);
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
      successKind: 'added',
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
    const successKind = req.query.sent === 'request' ? 'request' : 'added';

    return renderPublicPage(res, 'public/add-name-success', {
      ...context,
      submittedName: String(req.query.name || '').trim(),
      successKind,
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
