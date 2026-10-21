const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const Synagogue = require('../models/Synagogue');
const { hashPassword } = require('../lib/password');
const { normalizeSlug, isValidSlug } = require('../lib/normalize-slug');
const {
    normalizeWebAddressInput,
    isValidWebAddress,
    webAddressFromCommunityName,
} = require('../lib/community-web-address');
const { resolveBoardTitles, primaryBoardTitle } = require('../lib/default-board-titles');
const { resolveTimezone } = require('../lib/normalize-timezone');
const { getAdminLocaleContext, normalizeAdminLang } = require('../lib/admin-locale');
const { getMasterTranslator } = require('../lib/master-translations');
const { buildSynagoguePayloadFromWizard, WIZARD_STEPS } = require('../lib/master-provisioning');
const { optimizeUploadedImage } = require('../lib/image-optimize');
const { BOARD_FEATURE_DEFAULTS } = require('../lib/board-features');
const { verifyMasterPassword } = require('../lib/master-auth');
const { invalidateBoardCache } = require('../lib/board-cache');
const {
    summarizeBoardScreens,
    resolvePublishedVersion,
    formatPublishedAt,
} = require('../lib/board-publish');
const { currentCodeVersion, loadChangelog } = require('../lib/changelog');
const { refreshCommunityDisplayScreens } = require('../lib/refresh-display-screens');
const { communityLogoUrl } = require('../lib/community-logo-url');
const { loadMasterCommunitiesList } = require('../lib/master-communities-list');
const {
  createLoginRateLimiter,
  regenerateSession,
  isAllowedImageUpload,
  isAllowedCommunityLogoUpload,
} = require('../lib/http-security');
const OnboardingInvite = require('../models/OnboardingInvite');
const CommunityOnboardingRequest = require('../models/CommunityOnboardingRequest');
const { createSynagogueFromOnboardingRequest } = require('../lib/onboarding-approve');
const {
  mergePresetSavedViews,
  resolveDefaultActiveSavedViewId,
} = require('../lib/saved-view-presets');
const { processCommunityLogoUpload } = require('../lib/community-logo-upload');
const { applyDefaultCommunityQrToDocument } = require('../lib/default-community-qr');
const { MAX_UPLOAD_BYTES } = require('../lib/upload-limits');
const loginRateLimiter = createLoginRateLimiter();

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
        fileSize: MAX_UPLOAD_BYTES,
        files: 12,
    },
    fileFilter(req, file, cb) {
        if (file.fieldname === 'logo') {
            if (!isAllowedCommunityLogoUpload(file)) {
                return cb(new Error('image_only'));
            }
        } else if (file.fieldname === 'donationQrImage') {
            if (!isAllowedImageUpload(file)) {
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

function getMasterLang() {
  return 'he';
}

function renderMaster(req, res, view, options = {}) {
  const masterLanguage = getMasterLang();
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
    renderMaster(req, res, 'master/login', { showMasterLogout: false, error: null });
});

router.post('/login', loginRateLimiter, async (req, res) => {
    const { password } = req.body;
    const t = getMasterTranslator(getMasterLang());

    try {
        if (await verifyMasterPassword(password)) {
            await regenerateSession(req);
            req.session.isMasterAdmin = true;
            return res.redirect('/master/communities');
        }

        return renderMaster(req, res, 'master/login', { showMasterLogout: false, error: t('invalid_password') });
    } catch (err) {
        console.error('Master login error:', err);
        return renderMaster(req, res, 'master/login', { showMasterLogout: false, error: t('invalid_password') });
    }
});

router.get('/', requireMaster, (req, res) => {
    res.redirect('/master/communities');
});

router.get('/dashboard', requireMaster, (req, res) => {
    res.redirect('/master/communities');
});

router.get('/onboarding', requireMaster, (req, res) => {
    const query = new URLSearchParams();
    if (req.query.invite) query.set('invite', String(req.query.invite));
    if (req.query.saved === '1') query.set('onboarding_saved', '1');
    if (req.query.rejected === '1') query.set('onboarding_rejected', '1');
    if (req.query.error) query.set('onboarding_error', String(req.query.error));
    if (req.query.created) query.set('created', String(req.query.created));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    res.redirect(`/master/communities${suffix}#master-onboarding`);
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

async function loadOnboardingRequests() {
    const requests = await CommunityOnboardingRequest.find({ status: 'pending' })
        .select('-adminPasswordHash')
        .sort({ submittedAt: -1 })
        .lean();

    return requests.map((row) => ({
        ...row,
        submittedLabel: formatSubmittedAt(row.submittedAt),
    }));
}

router.get('/communities', requireMaster, async (req, res) => {
    try {
        const lang = getMasterLang();
        const t = getMasterTranslator(lang);
        const synagogues = (await loadMasterCommunitiesList()).map((synagogue) => {
            const summary = summarizeBoardScreens(
                synagogue.boardClients,
                resolvePublishedVersion(synagogue.publishedVersion),
            );
            return {
                ...synagogue,
                logoUrl: communityLogoUrl(synagogue),
                publishSummary: {
                    ...summary,
                    publishedAtLabel: formatPublishedAt(synagogue.publishedAt, lang),
                    screens: summary.screens.slice(0, 6).map((screen) => ({
                        ...screen,
                        clientLabel: t(`screen_client_${screen.client}`),
                        lastSeenLabel: formatPublishedAt(screen.lastSeenAt, lang),
                    })),
                },
            };
        });
        const onboardingRequests = await loadOnboardingRequests();
        renderMaster(req, res, 'master/dashboard', {
            synagogues,
            onboardingRequests,
            inviteUrl: req.query.invite ? String(req.query.invite) : '',
            onboardingSaved: req.query.onboarding_saved === '1',
            onboardingRejected: req.query.onboarding_rejected === '1',
            onboardingError: req.query.onboarding_error || null,
            codeChangelog: loadChangelog(),
            appCodeVersion: currentCodeVersion(),
            showMasterLogout: true,
            showMasterMap: true,
            saved: req.query.saved === '1',
            refreshed: req.query.refreshed === '1',
            error: req.query.error || null,
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.get('/new', requireMaster, (req, res) => {
    const t = getMasterTranslator(getMasterLang());
    const wizardLabelKeys = [
        'wizard_step_basics_title', 'wizard_step_languages_title', 'wizard_step_location_title',
        'wizard_step_logo_title', 'wizard_step_donation_title', 'wizard_step_appearance_title',
        'wizard_step_features_title', 'wizard_step_contacts_title',
        'wizard_step_yahrzeit_title', 'wizard_step_review_title',
        'wizard_review_name', 'wizard_review_slug', 'wizard_review_language', 'wizard_review_city',
        'wizard_review_donation', 'wizard_review_yahrzeit_email',
        'wizard_review_skipped', 'wizard_review_none_skipped', 'wizard_yes', 'wizard_no',
        'wizard_not_added', 'wizard_not_set',
    ];
    const wizardLabels = {};
    wizardLabelKeys.forEach((key) => {
        wizardLabels[key] = t(key);
    });

    renderMaster(req, res, 'master/new', {
        showMasterLogout: true,
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
            const slug = normalizeWebAddressInput(req.body.slug)
                || webAddressFromCommunityName(name);
            const adminPassword = String(req.body.adminPassword || '');

            if (!name || !slug || !adminPassword) {
                return res.redirect('/master/new?error=missing_fields');
            }

            if (!isValidWebAddress(slug) || !isValidSlug(slug)) {
                return res.redirect('/master/new?error=invalid_slug');
            }

            const existing = await Synagogue.findOne({ slug });
            if (existing) {
                return res.redirect('/master/new?error=slug_exists');
            }

            const location = parseLocation(req.body);
            const languages = parseLanguages(req.body);
            const wizardPayload = buildSynagoguePayloadFromWizard(req.body, req.files || {}, slug);

            if (wizardPayload.provisioning && wizardPayload.provisioning.donationQrImage) {
                const rel = wizardPayload.provisioning.donationQrImage;
                const fullPath = path.join(__dirname, '..', ...rel.split('/'));
                const optimized = await optimizeUploadedImage(fullPath, 'qr');
                wizardPayload.provisioning.donationQrImage = path.posix.join(
                    path.posix.dirname(rel),
                    optimized,
                );
            }

            const boardTitles = wizardPayload.titles || resolveBoardTitles({});

            const newSynagogue = new Synagogue({
                name,
                slug,
                adminPassword: await hashPassword(adminPassword),
                title: primaryBoardTitle(boardTitles),
                location,
                language: languages.language,
                adminLanguage: languages.adminLanguage,
                publicSubmission: wizardPayload.publicSubmission,
                yahrzeitReminders: wizardPayload.yahrzeitReminders,
                shabbatTimesEnabled: wizardPayload.shabbatTimesEnabled,
                provisioning: wizardPayload.provisioning,
            });

            newSynagogue.titles = boardTitles;

            if (wizardPayload.boardFeatures) {
                newSynagogue.boardFeatures = wizardPayload.boardFeatures;
            }

            if (wizardPayload.theme) {
                Object.assign(newSynagogue.theme, wizardPayload.theme);
            }

            if (wizardPayload._logoFile) {
                const logoFile = wizardPayload._logoFile;
                newSynagogue.theme.logo = await processCommunityLogoUpload(logoFile.path, logoFile.mimetype);
            }

            newSynagogue.savedViews = mergePresetSavedViews(newSynagogue.savedViews);
            newSynagogue.activeSavedViewId = resolveDefaultActiveSavedViewId(newSynagogue.savedViews);

            await applyDefaultCommunityQrToDocument(newSynagogue);

            await newSynagogue.save();
            res.redirect(`/master/communities?saved=1&created=${encodeURIComponent(slug)}`);
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
            return res.redirect('/master/communities?error=missing_fields');
        }

        if (!isValidSlug(slug)) {
            return res.redirect('/master/communities?error=invalid_slug');
        }

        const duplicate = await Synagogue.findOne({ slug, _id: { $ne: id } });
        if (duplicate) {
            return res.redirect('/master/communities?error=slug_exists');
        }

        const weeklyKaddishReminderEnabled = req.body.weeklyKaddishReminderEnabled === '1'
            || req.body.weeklyKaddishReminderEnabled === 'on';

        const update = {
            name,
            slug,
            title: name,
            location,
            language: languages.language,
            adminLanguage: languages.adminLanguage,
            weeklyKaddishReminderEnabled,
        };

        if (adminPassword) {
            update.adminPassword = await hashPassword(adminPassword);
        }

        await Synagogue.updateOne({ _id: id }, { $set: update });
        res.redirect('/master/communities?saved=1');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/delete', requireMaster, async (req, res) => {
    try {
        const { id } = req.body;
        await Synagogue.findByIdAndDelete(id);
        res.redirect('/master/communities?saved=1');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

async function handleMasterRefreshScreens(req, res) {
    try {
        const slug = normalizeSlug(req.body.slug || '');
        const result = await refreshCommunityDisplayScreens(slug);
        if (!result) {
            return res.status(404).send('Not found');
        }
        return res.redirect('/master/communities?refreshed=1');
    } catch (err) {
        return res.status(500).send(err.message);
    }
}

router.post('/refresh-screens', requireMaster, handleMasterRefreshScreens);
router.post('/publish-version', requireMaster, handleMasterRefreshScreens);

router.post('/impersonate', requireMaster, async (req, res) => {
    try {
        const slug = normalizeSlug(req.body.slug || '');
        const synagogue = await Synagogue.findOne({ slug }, { slug: 1 }).lean();
        if (!synagogue) {
            return res.status(404).send('Not found');
        }

        await regenerateSession(req);
        req.session.isMasterAdmin = true;
        req.session.impersonatedByMaster = true;
        req.session.adminSlug = slug;
        req.session.adminUsername = null;
        console.info(`[master-impersonation] ${new Date().toISOString()} slug=${slug}`);
        return res.redirect(`/admin/${slug}/dashboard`);
    } catch (err) {
        return res.status(500).send(err.message);
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/master/login');
});

function formatSubmittedAt(date) {
    if (!date) {
        return '';
    }
    try {
        return new Date(date).toLocaleString();
    } catch {
        return String(date);
    }
}

router.post('/onboarding/invites', requireMaster, async (req, res) => {
    try {
        const label = String(req.body.label || '').trim();
        const token = OnboardingInvite.generateToken();
        await new OnboardingInvite({ token, label }).save();

        const host = String(req.get('X-Forwarded-Host') || req.get('Host') || '').split(',')[0].trim();
        const inviteUrl = `${req.protocol}://${host}/join/${token}`;
        return res.redirect(`/master/communities?invite=${encodeURIComponent(inviteUrl)}#master-onboarding`);
    } catch (err) {
        return res.status(500).send(err.message);
    }
});

router.post('/onboarding/approve', requireMaster, async (req, res) => {
    try {
        const id = String(req.body.id || '').trim();
        const request = await CommunityOnboardingRequest.findOne({ _id: id, status: 'pending' })
            .select('+adminPasswordHash');
        if (!request) {
            return res.redirect('/master/communities#master-onboarding');
        }

        const synagogue = await createSynagogueFromOnboardingRequest(request);
        request.status = 'approved';
        request.reviewedAt = new Date();
        request.createdSynagogueSlug = synagogue.slug;
        await request.save();
        invalidateBoardCache(synagogue.slug);

        return res.redirect(`/master/communities?onboarding_saved=1&created=${encodeURIComponent(synagogue.slug)}#master-onboarding`);
    } catch (err) {
        console.error('Onboarding approve error:', err);
        return res.redirect(`/master/communities?onboarding_error=${encodeURIComponent(err.message || 'approve_failed')}#master-onboarding`);
    }
});

router.post('/onboarding/reject', requireMaster, async (req, res) => {
    try {
        const id = String(req.body.id || '').trim();
        const reason = String(req.body.reason || '').trim();
        const request = await CommunityOnboardingRequest.findOne({ _id: id, status: 'pending' });
        if (!request) {
            return res.redirect('/master/communities#master-onboarding');
        }

        request.status = 'rejected';
        request.reviewedAt = new Date();
        request.rejectReason = reason;
        await request.save();

        return res.redirect('/master/communities?onboarding_rejected=1#master-onboarding');
    } catch (err) {
        return res.status(500).send(err.message);
    }
});

module.exports = router;
