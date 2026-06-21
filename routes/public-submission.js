const express = require('express');
const Synagogue = require('../models/Synagogue');
const { normalizePublicSubmission } = require('../lib/public-submission');
const {
  getPublicSubmissionTranslator,
  resolvePublicSubmissionLang,
  getMonthOptions,
} = require('../lib/public-submission-i18n');

const router = express.Router();

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
  const publicSubmission = normalizePublicSubmission(synagogue.publicSubmission);

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
      },
      errorMessage: req.query.error === 'required'
        ? pt('required_error')
        : req.query.error === 'date'
          ? pt('invalid_date_error')
          : '',
    });
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

router.post('/:slug/add-name', async (req, res) => {
  try {
    const synagogue = await Synagogue.findOne({ slug: req.params.slug });
    if (!synagogue) {
      return res.status(404).send('Synagogue not found');
    }

    const publicSubmission = normalizePublicSubmission(synagogue.publicSubmission);
    if (!publicSubmission.enabled) {
      return res.redirect(`/s/${req.params.slug}/add-name?error=disabled`);
    }

    const name = String(req.body.name || '').trim().slice(0, 120);
    const deathDate = parseDeathDate(req.body);
    const lang = resolvePublicSubmissionLang(req.body.lang, synagogue.language);

    if (!name) {
      return res.redirect(`/s/${req.params.slug}/add-name?lang=${lang}&error=required&name=${encodeURIComponent(name)}`);
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

    synagogue.people.push({
      id: maxId + 1,
      name,
      gregorianDateOfDeath: deathDate,
      photo: '',
      title: '',
      text: '',
    });

    await synagogue.save();

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
