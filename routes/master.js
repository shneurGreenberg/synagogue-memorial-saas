const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const Synagogue = require('../models/Synagogue');
const { hashPassword } = require('../lib/password');
const { normalizeSlug, isValidSlug } = require('../lib/normalize-slug');
const { resolveTimezone } = require('../lib/normalize-timezone');
const { getAdminLocaleContext, normalizeAdminLang } = require('../lib/admin-locale');
const { getMasterTranslator } = require('../lib/master-translations');
const { buildSynagoguePayloadFromWizard, WIZARD_STEPS } = require('../lib/master-provisioning');
const { optimizeUploadedImage } = require('../lib/image-optimize');
const { BOARD_FEATURE_DEFAULTS } = require('../lib/board-features');

const IMAGES_DIR = path.join(__dirname, '..', 'images');
const UPLOAD_TMP_DIR = path.join(__dirname, '..', 'provisioning', '_tmp');

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

ensureDir(IMAGES_DIR);
ensureDir(UPLOAD_TMP_DIR);

const masterUpload = multer({
    storage: multer.diskStorage({
        destination(req, file, cb) {
            ensureDir(UPLOAD_TMP_DIR);
            cb(null, UPLOAD_TMP_DIR);
        },
        filename(req, file, cb) {
            const ext = path.extname(file.originalname || '');
            cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
        },
    }),
    limits: {
        fileSize: 25 * 1024 * 1024,
        files: 12,
    },
    fileFilter(req, file, cb) {
        if (file.fieldname === 'logo' || file.fieldname === 'donationQrImage') {
            if (!file.mimetype || !file.mimetype.startsWith('image/')) {
                return cb(new Error('image_only'));
            }
        }
        cb(null, true);
    },
});

const wizardUpload = masterUpload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'donationQrImage', maxCount: 1 },
    { name: 'contactFiles', maxCount: 8 },
]);

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const NOMINATIM_HEADERS = {
  'User-Agent': 'SynagogueMemorialSaaS/1.0 (master-admin)',
  Accept: 'application/json',
};

function getMasterLang(req) {
  return normalizeAdminLang(req.session.masterLanguage || 'en');
}

function renderMaster(req, res, view, options = {}) {
  const masterLanguage = getMasterLang(req);
  const locale = getAdminLocaleContext(masterLanguage);
  const { OFFICIAL_LOGO_FILENAME } = require('../lib/board-defaults');

  res.render(view, {
    ...options,
    masterLanguage,
    masterTranslate: getMasterTranslator(masterLanguage),
    masterDir: locale.adminDir,
    masterIsRtl: locale.adminIsRtl,
    officialLogoUrl: `/images/${OFFICIAL_LOGO_FILENAME}`,
    layout: options.layout === false ? false : (options.layout || 'master'),
  });
}

function requireMaster(req, res, next) {
    if (req.session.isMasterAdmin) {
        return next();
    }
    res.redirect('/master/login');
}

function requireMasterApi(req, res, next) {
    if (req.session.isMasterAdmin) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
}

function parseLocation(body) {
    const lat = parseFloat(body.lat);
    const long = parseFloat(body.long);
    const city = String(body.city || '').trim();
    const timezone = resolveTimezone(body.timezone, lat, long);

    return {
        lat: Number.isFinite(lat) ? lat : 54.9833,
        long: Number.isFinite(long) ? long : 82.8964,
        city: city || 'Community',
        timezone,
    };
}

function parseLanguages(body) {
    return {
        language: normalizeAdminLang(body.language || 'ru'),
        adminLanguage: normalizeAdminLang(body.adminLanguage || body.language || 'ru'),
    };
}

async function nominatimFetch(path) {
    const response = await fetch(`${NOMINATIM}${path}`, { headers: NOMINATIM_HEADERS });
    if (!response.ok) {
        throw new Error(`Geocoding failed (${response.status})`);
    }
    return response.json();
}

function formatPlace(item) {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const label = item.display_name || item.name || 'Unknown place';

    return {
        label,
        city: item.address?.city
            || item.address?.town
            || item.address?.village
            || item.address?.municipality
            || item.name
            || label.split(',')[0],
        lat,
        lng,
        timezone: resolveTimezone(null, lat, lng),
    };
}

router.get('/login', (req, res) => {
    renderMaster(req, res, 'master/login', { showMasterNav: false, error: null });
});

router.post('/login', (req, res) => {
    const { password } = req.body;
    const masterPassword = process.env.MASTER_ADMIN_PASSWORD || 'master';
    const t = getMasterTranslator(getMasterLang(req));

    if (password === masterPassword) {
        req.session.isMasterAdmin = true;
        if (!req.session.masterLanguage) {
            req.session.masterLanguage = 'en';
        }
        return res.redirect('/master/dashboard');
    }

    renderMaster(req, res, 'master/login', { showMasterNav: false, error: t('invalid_password') });
});

router.post('/language', requireMaster, (req, res) => {
    req.session.masterLanguage = normalizeAdminLang(req.body.language);
    const back = req.get('Referer') || '/master/dashboard';
    res.redirect(back);
});

router.get('/api/places', requireMasterApi, async (req, res) => {
    try {
        const q = String(req.query.q || '').trim();
        if (q.length < 2) {
            return res.json([]);
        }

        const data = await nominatimFetch(
            `/search?format=json&q=${encodeURIComponent(q)}&limit=8&addressdetails=1`,
        );

        res.json((data || []).map(formatPlace));
    } catch (err) {
        res.status(502).json({ error: err.message });
    }
});

router.get('/api/reverse', requireMasterApi, async (req, res) => {
    try {
        const lat = parseFloat(req.query.lat);
        const lng = parseFloat(req.query.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return res.status(400).json({ error: 'Invalid coordinates' });
        }

        const data = await nominatimFetch(
            `/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        );

        res.json(formatPlace(data));
    } catch (err) {
        res.status(502).json({ error: err.message });
    }
});

router.get('/dashboard', requireMaster, async (req, res) => {
    try {
        const synagogues = await Synagogue.find({}).sort({ name: 1 }).lean();
        renderMaster(req, res, 'master/dashboard', {
            synagogues,
            showMasterNav: true,
            showMasterMap: true,
            saved: req.query.saved === '1',
            error: req.query.error || null,
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.get('/new', requireMaster, (req, res) => {
    const t = getMasterTranslator(getMasterLang(req));
    const wizardLabelKeys = [
        'wizard_step_basics_title', 'wizard_step_languages_title', 'wizard_step_location_title',
        'wizard_step_logo_title', 'wizard_step_donation_title', 'wizard_step_appearance_title',
        'wizard_step_features_title', 'wizard_step_contacts_title', 'wizard_step_photos_title',
        'wizard_step_yahrzeit_title', 'wizard_step_review_title',
        'wizard_review_name', 'wizard_review_slug', 'wizard_review_language', 'wizard_review_city',
        'wizard_review_donation', 'wizard_review_photos_drive', 'wizard_review_yahrzeit_email',
        'wizard_review_skipped', 'wizard_review_none_skipped', 'wizard_yes', 'wizard_no',
        'wizard_not_added', 'wizard_not_set',
    ];
    const wizardLabels = {};
    wizardLabelKeys.forEach((key) => {
        wizardLabels[key] = t(key);
    });

    renderMaster(req, res, 'master/new', {
        showMasterNav: true,
        showMasterMap: true,
        showMasterWizard: true,
        wizardSteps: WIZARD_STEPS,
        boardFeatureDefaults: BOARD_FEATURE_DEFAULTS,
        wizardLabelsJson: JSON.stringify(wizardLabels),
        error: req.query.error || null,
    });
});

router.post('/add', requireMaster, (req, res) => {
    wizardUpload(req, res, async (uploadErr) => {
        if (uploadErr) {
            const code = uploadErr.message === 'image_only' ? 'error_upload' : 'error_upload';
            return res.redirect(`/master/new?error=${code}`);
        }

        try {
            const name = String(req.body.name || '').trim();
            const slug = normalizeSlug(req.body.slug);
            const adminPassword = String(req.body.adminPassword || '');

            if (!name || !slug || !adminPassword) {
                return res.redirect('/master/new?error=missing_fields');
            }

            if (!isValidSlug(slug)) {
                return res.redirect('/master/new?error=invalid_slug');
            }

            const existing = await Synagogue.findOne({ slug });
            if (existing) {
                return res.redirect('/master/new?error=slug_exists');
            }

            const location = parseLocation(req.body);
            const languages = parseLanguages(req.body);
            const wizardPayload = buildSynagoguePayloadFromWizard(req.body, req.files || {}, slug);

            const newSynagogue = new Synagogue({
                name,
                slug,
                adminPassword: await hashPassword(adminPassword),
                title: name,
                location,
                language: languages.language,
                adminLanguage: languages.adminLanguage,
                publicSubmission: wizardPayload.publicSubmission,
                yahrzeitReminders: wizardPayload.yahrzeitReminders,
                shabbatTimesEnabled: wizardPayload.shabbatTimesEnabled,
                provisioning: wizardPayload.provisioning,
            });

            if (wizardPayload.titles) {
                newSynagogue.titles = wizardPayload.titles;
            }

            if (wizardPayload.boardFeatures) {
                newSynagogue.boardFeatures = wizardPayload.boardFeatures;
            }

            if (wizardPayload.theme) {
                Object.assign(newSynagogue.theme, wizardPayload.theme);
            }

            if (wizardPayload._logoFile) {
                newSynagogue.theme.logo = await optimizeUploadedImage(wizardPayload._logoFile.path, 'logo');
            }

            await newSynagogue.save();
            res.redirect(`/master/dashboard?saved=1&created=${encodeURIComponent(slug)}`);
        } catch (err) {
            res.status(500).send(err.message);
        }
    });
});

router.post('/edit', requireMaster, async (req, res) => {
    try {
        const id = req.body.id;
        const name = String(req.body.name || '').trim();
        const slug = normalizeSlug(req.body.slug);
        const adminPassword = String(req.body.adminPassword || '').trim();
        const location = parseLocation(req.body);
        const languages = parseLanguages(req.body);

        if (!id || !name || !slug) {
            return res.redirect('/master/dashboard?error=missing_fields');
        }

        if (!isValidSlug(slug)) {
            return res.redirect('/master/dashboard?error=invalid_slug');
        }

        const duplicate = await Synagogue.findOne({ slug, _id: { $ne: id } });
        if (duplicate) {
            return res.redirect('/master/dashboard?error=slug_exists');
        }

        const update = {
            name,
            slug,
            title: name,
            location,
            language: languages.language,
            adminLanguage: languages.adminLanguage,
        };

        if (adminPassword) {
            update.adminPassword = await hashPassword(adminPassword);
        }

        await Synagogue.updateOne({ _id: id }, { $set: update });
        res.redirect('/master/dashboard?saved=1');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/delete', requireMaster, async (req, res) => {
    try {
        const { id } = req.body;
        await Synagogue.findByIdAndDelete(id);
        res.redirect('/master/dashboard?saved=1');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/master/login');
});

module.exports = router;
