const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Synagogue = require('../models/Synagogue');
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
const { optimizeUploadedImage } = require('../lib/image-optimize');
const { parsePhotoCropFromBody } = require('../lib/photo-crop');

const router = express.Router();
const OFFICIAL_LOGO_FILENAME = 'kaddish-official-logo.svg';

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
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
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
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.redirect(`/s/${req.params.slug}/add-name?lang=${lang}&error=upload`);
    }
    if (err.message === 'image_only') {
      return res.redirect(`/s/${req.params.slug}/add-name?lang=${lang}&error=upload`);
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

function buildPageContext(synagogue, lang) {
  const pt = getPublicSubmissionTranslator(lang);
  const publicSubmission = normalizePublicSubmission(synagogue.publicSubmission, synagogue.provisioning);
  const communityLogo = synagogue.theme && synagogue.theme.logo;

  return {
    synagogue,
    lang,
    dir: lang === 'he' ? 'rtl' : 'ltr',
    pt,
    publicSubmission,
    boardUrl: `/s/${synagogue.slug}`,
    formUrl: `/s/${synagogue.slug}/add-name`,
    successUrl: `/s/${synagogue.slug}/add-name/success`,
    charityUrl: `/s/${synagogue.slug}/add-name/charity`,
    officialLogoUrl: `/images/${OFFICIAL_LOGO_FILENAME}`,
    communityLogoUrl: communityLogo ? `/images/${communityLogo}` : '',
  };
}

router.get('/:slug/add-name', async (req, res) => {
  try {
    const synagogue = await loadSynagogue(req.params.slug);
    if (!synagogue) {
      return res.status(404).send('Synagogue not found');
    }

    const lang = resolvePublicSubmissionLang(req.query.lang, synagogue.language);
    const context = buildPageContext(synagogue, lang);
    const { publicSubmission, pt } = context;

    if (!publicSubmission.enabled) {
      return renderPublicPage(res, 'public/add-name-disabled', context);
    }

    return renderPublicPage(res, 'public/add-name', {
      ...context,
      monthOptions: getMonthOptions(lang),
      error: req.query.error || '',
      values: {
        name: req.query.name || '',
        month: req.query.month || '',
        date: req.query.date || '',
        year: req.query.year || '',
        contactName: req.query.contactName || '',
        contactPhone: req.query.contactPhone || '',
        contactEmail: req.query.contactEmail || '',
        contactPlatform: req.query.contactPlatform || '',
      },
      errorMessage: req.query.error === 'required'
        ? pt('required_error')
        : req.query.error === 'contact'
          ? pt('contact_required_error')
          : req.query.error === 'date'
            ? pt('invalid_date_error')
            : req.query.error === 'upload'
              ? pt('upload_error')
              : '',
      contactPlatformOptions: getContactPlatformOptions(lang),
    });
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

router.post('/:slug/add-name', handlePublicPhotoUpload, async (req, res) => {
  try {
    const synagogue = await Synagogue.findOne({ slug: req.params.slug });
    if (!synagogue) {
      return res.status(404).send('Synagogue not found');
    }

    const publicSubmission = normalizePublicSubmission(synagogue.publicSubmission, synagogue.provisioning);
    if (!publicSubmission.enabled) {
      return res.redirect(`/s/${req.params.slug}/add-name?error=disabled`);
    }

    const name = String(req.body.name || '').trim().slice(0, 120);
    const deathDate = parseDeathDate(req.body);
    const contact = parsePersonContactFromBody(req.body);
    const lang = resolvePublicSubmissionLang(req.body.lang, synagogue.language);

    if (!name || !String(contact.name || '').trim()) {
      return res.redirect(`/s/${req.params.slug}/add-name?lang=${lang}&error=required&name=${encodeURIComponent(name)}`);
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
      return res.redirect(`/s/${req.params.slug}/add-name?${params.toString()}`);
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
      return res.redirect(`/s/${req.params.slug}/add-name?${params.toString()}`);
    }

    const maxId = (synagogue.people || []).reduce((max, person) => (
      person.id > max ? person.id : max
    ), 0);

    let photoFilename = '';
    let photoCrop;
    if (req.file) {
      photoFilename = await optimizeUploadedImage(req.file.path, 'photo');
      photoCrop = parsePhotoCropFromBody(req.body);
    }

    const newPerson = {
      id: maxId + 1,
      name,
      gregorianDateOfDeath: deathDate,
      photo: photoFilename,
      photoCrop,
      title: '',
      text: '',
      contact,
    };

    await Synagogue.updateOne(
      { slug: req.params.slug },
      { $push: { people: newPerson } },
    );

    return res.redirect(`/s/${req.params.slug}/add-name/success?lang=${lang}&name=${encodeURIComponent(name)}`);
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
