const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const Synagogue = require('../models/Synagogue');
const graveOcr = require('../lib/grave-ocr');
const {
  readScanImage,
  findNameMatches,
  persistPersonPhoto,
  saveScannedPerson,
} = require('../lib/grave-scan');
const {
  resolveAdminPermissions,
  permissionAllows,
  getDefaultLandingPath,
} = require('../lib/admin-users');
const { isAllowedImageUpload, publicErrorMessage } = require('../lib/http-security');

const router = express.Router();

const scanRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'rate_limited', message: 'Слишком много снимков. Подождите немного.' },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!isAllowedImageUpload(file)) {
      return cb(new Error('image_only'));
    }
    return cb(null, true);
  },
});

function acceptScanUpload(req, res, next) {
  const type = String(req.headers['content-type'] || '');
  if (!type.includes('multipart/form-data')) {
    return next();
  }

  return upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'photo', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ])(req, res, (err) => {
    if (!err) {
      return next();
    }
    const tooLarge = err.code === 'LIMIT_FILE_SIZE';
    return res.status(400).json({
      ok: false,
      error: tooLarge ? 'image_too_large' : 'image_only',
      message: tooLarge
        ? 'Фото больше 10 МБ. Снимите плиту ближе или выберите файл поменьше.'
        : 'Нужна фотография JPG, PNG или WebP.',
    });
  });
}

async function requireScanStaff(req, res, next) {
  const slug = req.params.slug;
  const session = req.session;
  const loggedIn = session && session.adminSlug === slug;

  if (!loggedIn) {
    if (req.method === 'GET') {
      return res.redirect(`/admin/login?next=${encodeURIComponent(`/s/${slug}/scan`)}`);
    }
    return res.status(401).json({
      ok: false,
      error: 'auth_required',
      message: 'Войдите как сотрудник общины.',
    });
  }

  try {
    const synagogue = await Synagogue.findOne({ slug }).lean();
    if (!synagogue) {
      if (req.method === 'GET') {
        return res.status(404).send('Synagogue not found');
      }
      return res.status(404).json({ ok: false, error: 'not_found' });
    }

    const permissions = resolveAdminPermissions(session, synagogue) || {};
    if (!permissionAllows(permissions, 'people')) {
      if (req.method === 'GET') {
        return res.redirect(getDefaultLandingPath(slug, permissions));
      }
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }

    req.synagogue = synagogue;
    return next();
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'server', message: publicErrorMessage(err) });
  }
}

function scanFailure(err) {
  if (err && err.code === 'ocr_not_configured') {
    return {
      status: 503,
      body: {
        ok: false,
        error: 'ocr_not_configured',
        message: 'Авточтение не настроено. Заполните карточку вручную или задайте OPENROUTER_API_KEY.',
      },
    };
  }
  if (err && err.code === 'image_unreadable') {
    return {
      status: 400,
      body: {
        ok: false,
        error: 'image_unreadable',
        message: 'Не удалось открыть фото. Снимите плиту ещё раз.',
      },
    };
  }
  if (err && err.code === 'image_too_large') {
    return {
      status: 400,
      body: {
        ok: false,
        error: 'image_too_large',
        message: 'Фото слишком большое.',
      },
    };
  }
  return {
    status: 502,
    body: {
      ok: false,
      error: 'ocr_failed',
      message: 'Не удалось прочитать надпись. Заполните карточку вручную.',
    },
  };
}

router.get('/:slug/scan', requireScanStaff, (req, res) => {
  const synagogue = req.synagogue;
  res.setHeader('Cache-Control', 'no-store');
  return res.render('public/scan-grave', {
    layout: 'scan',
    lang: 'ru',
    synagogue,
    scanUrl: `/s/${synagogue.slug}/api/scan-grave`,
    confirmUrl: `/s/${synagogue.slug}/api/scan-grave/confirm`,
    loginUrl: `/admin/login?next=${encodeURIComponent(`/s/${synagogue.slug}/scan`)}`,
    peopleUrl: `/admin/${synagogue.slug}/people`,
    boardUrl: `/s/${synagogue.slug}`,
  });
});

router.post('/:slug/api/scan-grave', scanRateLimiter, requireScanStaff, acceptScanUpload, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const image = readScanImage(req);
  if (!image) {
    return res.status(400).json({
      ok: false,
      error: 'image_required',
      message: 'Добавьте фотографию надгробия.',
    });
  }

  try {
    const fields = await graveOcr.scanGraveImage(image);
    const matches = findNameMatches(req.synagogue.people, fields.name);
    return res.json({ ok: true, ...fields, matches });
  } catch (err) {
    if (err && err.detail) {
      console.error('Grave OCR failed:', err.message, err.detail);
    } else {
      console.error('Grave OCR failed:', err && err.message);
    }
    const failure = scanFailure(err);
    return res.status(failure.status).json(failure.body);
  }
});

router.post('/:slug/api/scan-grave/confirm', scanRateLimiter, requireScanStaff, acceptScanUpload, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const image = readScanImage(req);
  if (!image) {
    return res.status(400).json({
      ok: false,
      error: 'image_required',
      message: 'Добавьте фотографию надгробия.',
    });
  }

  let photoFilename = '';
  try {
    photoFilename = await persistPersonPhoto(image.buffer, image.mimeType);
    const saved = await saveScannedPerson(Synagogue, req.params.slug, req.body || {}, photoFilename);
    return res.json({ ok: true, created: saved.created, person: saved.person });
  } catch (err) {
    const code = err && err.code;
    if (code === 'name_required') {
      return res.status(400).json({ ok: false, error: code, message: 'Укажите имя.' });
    }
    if (code === 'date_required') {
      return res.status(400).json({ ok: false, error: code, message: 'Укажите полную дату смерти: день, месяц и год.' });
    }
    if (code === 'person_not_found') {
      return res.status(404).json({ ok: false, error: code, message: 'Запись для обновления не найдена.' });
    }
    if (code === 'not_found') {
      return res.status(404).json({ ok: false, error: code });
    }
    console.error('Grave scan confirm failed:', err && err.message);
    return res.status(500).json({ ok: false, error: 'server', message: publicErrorMessage(err, 'Не удалось сохранить запись.') });
  }
});

module.exports = router;
