const express = require('express');
const router = express.Router();
const Synagogue = require('../models/Synagogue');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyPassword, ensureHashed } = require('../lib/password');
const { sanitizeRichText } = require('../lib/sanitize');
const { enrichSynagogueForAdmin, normalizeTitles, sanitizeHexColor } = require('../lib/admin-theme');
const { getTranslator } = require('../lib/admin-translations');
const { getAdminLocaleContext } = require('../lib/admin-locale');
const { BOARD_THEME_DEFAULTS } = require('../lib/board-defaults');
const { parseBoardFeaturesFromBody } = require('../lib/board-features');
const {
  IMAGES_DIR,
  PHOTOS_DIR,
} = require('../lib/storage-paths');
const { optimizeUploadedImage } = require('../lib/image-optimize');
const {
  buildCommunityEventPayload,
  categorizeCommunityEvents,
} = require('../lib/community-events');
const {
  parseSlugAndUsername,
  normalizeAdminUsername,
  findAdminUser,
  resolveAdminPermissions,
  getDefaultLandingPath,
  applyUserDisplaySettings,
  parsePermissionsFromBody,
  permissionsForStorage,
  buildPermissionToggles,
  buildSettingsSectionToggles,
  serializeAdminUsers,
  FULL_ADMIN_PERMISSIONS,
  canSaveBoardSettings,
  permissionAllows,
} = require('../lib/admin-users');
const { normalizeAdminLang } = require('../lib/admin-locale');

const BOARD_FEATURE_TOGGLE_META = [
  { key: 'sidebarNames', labelKey: 'feature_sidebar_names', helpKey: 'feature_sidebar_names_help' },
  { key: 'dailyChumash', labelKey: 'feature_daily_chumash', helpKey: 'feature_daily_chumash_help' },
  { key: 'dailyTehillim', labelKey: 'feature_daily_tehillim', helpKey: 'feature_daily_tehillim_help' },
  { key: 'dailyTanya', labelKey: 'feature_daily_tanya', helpKey: 'feature_daily_tanya_help' },
  { key: 'dailyRambam', labelKey: 'feature_daily_rambam', helpKey: 'feature_daily_rambam_help' },
  { key: 'hayomYom', labelKey: 'feature_hayom_yom', helpKey: 'feature_hayom_yom_help' },
  { key: 'upcomingHolidays', labelKey: 'feature_upcoming_holidays', helpKey: 'feature_upcoming_holidays_help' },
  { key: 'communityEvents', labelKey: 'feature_community_events', helpKey: 'feature_community_events_help' },
];

function buildBoardFeatureToggles(boardFeatures) {
  const features = boardFeatures || {};

  return BOARD_FEATURE_TOGGLE_META.map((entry) => ({
    ...entry,
    enabled: features[entry.key] !== false,
  }));
}

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

// Configure Multer — absolute paths so uploads work regardless of process cwd
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.fieldname === 'photo') {
            ensureDir(PHOTOS_DIR);
            cb(null, PHOTOS_DIR);
        } else {
            ensureDir(IMAGES_DIR);
            cb(null, IMAGES_DIR);
        }
    },
    filename: function (req, file, cb) {
        let ext = path.extname(file.originalname).toLowerCase();
        if (!ext && file.mimetype && MIME_EXT[file.mimetype]) {
            ext = MIME_EXT[file.mimetype];
        }
        cb(null, `${Date.now()}${ext || '.jpg'}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        if (!file.mimetype || !file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image uploads are allowed'));
        }
        cb(null, true);
    },
});

const parseFormBody = upload.none();

function handleUpload(fields) {
    return (req, res, next) => {
        upload.fields(fields)(req, res, (err) => {
            if (err) {
                const slug = req.params.slug || req.session.adminSlug || '';
                return res.redirect(`/admin/${slug}/dashboard?error=upload`);
            }
            next();
        });
    };
}

// Middleware to check auth
const requireAdmin = (req, res, next) => {
    if (req.session.adminSlug) {
        return next();
    }
    res.redirect('/admin/login');
};

const requireFullAdmin = (req, res, next) => {
    if (req.session.adminUsername) {
        return res.status(403).send('Forbidden');
    }
    return next();
};

async function loadAdminContext(req, res, next) {
    const slug = req.params.slug || req.session.adminSlug;
    if (!req.session.adminSlug || slug !== req.session.adminSlug) {
        req.adminPermissions = null;
        req.adminUser = null;
        return next();
    }

    try {
        const synagogue = await Synagogue.findOne({ slug: req.session.adminSlug }).lean();
        req.adminPermissions = resolveAdminPermissions(req.session, synagogue);
        req.adminUser = req.session.adminUsername
            ? findAdminUser(synagogue, req.session.adminUsername)
            : null;
        return next();
    } catch (err) {
        return next(err);
    }
}

function requirePermission(permission) {
    return (req, res, next) => {
        if (req.params.slug !== req.session.adminSlug) {
            return res.status(403).send('Forbidden');
        }

        const permissions = req.adminPermissions || FULL_ADMIN_PERMISSIONS;
        if (!permissionAllows(permissions, permission)) {
            return res.redirect(getDefaultLandingPath(req.params.slug, permissions));
        }

        return next();
    };
}

router.get('/login', (req, res) => {
    res.render('admin/login', { layout: false });
});

router.post('/login', async (req, res) => {
    const { slug: slugInput, password } = req.body;
    const { slug, username } = parseSlugAndUsername(slugInput);
    try {
        const synagogue = await Synagogue.findOne({ slug }).select('+adminPassword');
        if (synagogue && await verifyPassword(password, synagogue.adminPassword)) {
            const hashed = await ensureHashed(password, synagogue.adminPassword);
            if (hashed) {
                await Synagogue.updateOne({ slug }, { $set: { adminPassword: hashed } });
            }

            if (username) {
                const adminUser = findAdminUser(synagogue, username);
                if (!adminUser) {
                    return res.render('admin/login', { error: 'Unknown user for this synagogue', layout: false });
                }
                req.session.adminSlug = slug;
                req.session.adminUsername = normalizeAdminUsername(username);
                const permissions = resolveAdminPermissions(req.session, synagogue);
                return res.redirect(getDefaultLandingPath(slug, permissions));
            }

            req.session.adminSlug = slug;
            req.session.adminUsername = null;
            return res.redirect(`/admin/${slug}/dashboard`);
        }
        res.render('admin/login', { error: 'Invalid credentials', layout: false });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

router.use('/:slug', loadAdminContext);

const getInitials = (name) => {
    if (!name) {
        return '?';
    }

    return name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
};

function renderAdmin(res, view, options = {}) {
    const synagogue = options.synagogue;
    const adminUser = options.adminUser || null;
    const displaySynagogue = applyUserDisplaySettings(
        enrichSynagogueForAdmin(synagogue),
        adminUser,
    );
    const locale = getAdminLocaleContext(displaySynagogue && displaySynagogue.adminLanguage);

    res.render(view, {
        ...options,
        synagogue: displaySynagogue,
        adminUser,
        adminPermissions: options.adminPermissions || FULL_ADMIN_PERMISSIONS,
        adminTranslate: getTranslator(locale.adminLanguage),
        adminDir: locale.adminDir,
        adminIsRtl: locale.adminIsRtl,
        layout: options.layout === false ? false : (options.layout || 'admin'),
    });
}

function wantsJson(req) {
    return req.get('X-Requested-With') === 'XMLHttpRequest' || req.query.ajax === '1';
}

async function fetchSlideshow(slug) {
    const doc = await Synagogue.findOne({ slug }).lean();
    return doc ? doc.slideshow : null;
}

async function fetchCommunityEvents(slug) {
    const doc = await Synagogue.findOne({ slug }).lean();
    return doc ? (doc.communityEvents || []) : [];
}

async function persistTitlesIfMissing(synagogue) {
    if (!synagogue || !synagogue.slug) {
        return synagogue;
    }

    const normalized = normalizeTitles(synagogue);
    const stored = synagogue.titles || {};
    const hasStoredTitles = ['ru', 'en', 'he'].some((lang) => String(stored[lang] || '').trim());

    if (!hasStoredTitles && normalized.ru) {
        await Synagogue.updateOne({ slug: synagogue.slug }, {
            $set: {
                'titles.ru': normalized.ru,
                'titles.en': normalized.en,
                'titles.he': normalized.he,
                title: normalized.ru,
            },
        });
        synagogue.titles = normalized;
    }

    return synagogue;
}

router.post('/:slug/settings', requireAdmin, requirePermission('settings'), handleUpload([
    { name: 'logo', maxCount: 1 },
    { name: 'backgroundImage', maxCount: 1 },
    { name: 'tilesBackground', maxCount: 1 }
]), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const permissions = req.adminPermissions || FULL_ADMIN_PERMISSIONS;
        const {
            titleRu, titleEn, titleHe, primaryColor, textColor, accentColor,
            language, shabbatTimesEnabled,
        } = req.body;
        const boardFeatures = parseBoardFeaturesFromBody(req.body);
        const updateData = {};

        if (permissions.settingsAppearance) {
            const titles = {
                ru: String(titleRu ?? '').trim(),
                en: String(titleEn ?? '').trim(),
                he: String(titleHe ?? '').trim(),
            };
            updateData['titles.ru'] = titles.ru;
            updateData['titles.en'] = titles.en;
            updateData['titles.he'] = titles.he;
            updateData.title = titles.ru;
            updateData['theme.primaryColor'] = sanitizeHexColor(primaryColor, BOARD_THEME_DEFAULTS.primaryColor);
            updateData['theme.textColor'] = sanitizeHexColor(textColor, BOARD_THEME_DEFAULTS.textColor);
            updateData['theme.accentColor'] = sanitizeHexColor(accentColor, BOARD_THEME_DEFAULTS.accentColor);
        }

        if (permissions.settingsLanguages) {
            updateData.language = language;
        }

        if (permissions.settingsFeatures) {
            updateData.shabbatTimesEnabled = !!shabbatTimesEnabled;
            Object.assign(updateData, Object.fromEntries(
                Object.entries(boardFeatures).map(([key, value]) => [`boardFeatures.${key}`, value]),
            ));
        }

        if (permissions.settingsBranding && req.files['logo']) {
            updateData['theme.logo'] = await optimizeUploadedImage(req.files['logo'][0].path, 'logo');
        }
        if (permissions.settingsBranding && req.files['backgroundImage']) {
            updateData['theme.backgroundImage'] = await optimizeUploadedImage(req.files['backgroundImage'][0].path, 'background');
        }
        if (permissions.settingsBranding && req.files['tilesBackground']) {
            updateData['theme.tilesBackground'] = await optimizeUploadedImage(req.files['tilesBackground'][0].path, 'tilesBackground');
        }

        if (Object.keys(updateData).length > 0) {
            await Synagogue.updateOne({ slug: req.params.slug }, { $set: updateData });
        }
        res.redirect(`/admin/${req.params.slug}/dashboard?saved=1`);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/:slug/settings/reset-theme', requireAdmin, requirePermission('settings'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    const permissions = req.adminPermissions || FULL_ADMIN_PERMISSIONS;
    if (!permissions.settingsAppearance) {
        return res.status(403).send('Forbidden');
    }
    try {
        await Synagogue.updateOne({ slug: req.params.slug }, {
            $set: {
                'theme.primaryColor': BOARD_THEME_DEFAULTS.primaryColor,
                'theme.textColor': BOARD_THEME_DEFAULTS.textColor,
                'theme.accentColor': BOARD_THEME_DEFAULTS.accentColor,
                'theme.logo': BOARD_THEME_DEFAULTS.logo,
            },
            $unset: {
                'theme.backgroundImage': '',
                'theme.tilesBackground': '',
            },
        });
        res.redirect(`/admin/${req.params.slug}/dashboard?saved=1`);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/:slug/my-preferences', requireAdmin, parseFormBody, async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    const permissions = req.adminPermissions || FULL_ADMIN_PERMISSIONS;
    if (!permissions.settingsAdminPanel && req.session.adminUsername) {
        return res.status(403).json({ ok: false, error: 'Forbidden' });
    }
    try {
        const { adminLanguage, colorMode } = req.body;
        const safeColorMode = colorMode === 'light' ? 'light' : 'dark';
        const safeLanguage = normalizeAdminLang(adminLanguage);

        if (req.session.adminUsername && req.adminUser) {
            await Synagogue.updateOne(
                {
                    slug: req.params.slug,
                    'adminUsers._id': req.adminUser._id,
                },
                {
                    $set: {
                        'adminUsers.$.adminLanguage': safeLanguage,
                        'adminUsers.$.adminTheme.colorMode': safeColorMode,
                    },
                },
            );
        } else {
            await Synagogue.updateOne({ slug: req.params.slug }, {
                $set: {
                    adminLanguage: safeLanguage,
                    'adminTheme.colorMode': safeColorMode,
                },
            });
        }

        if (wantsJson(req)) {
            return res.json({ ok: true, adminLanguage: safeLanguage, colorMode: safeColorMode });
        }

        const referer = req.get('Referer') || `/admin/${req.params.slug}/dashboard`;
        return res.redirect(referer);
    } catch (err) {
        if (wantsJson(req)) {
            return res.status(500).json({ ok: false, error: err.message });
        }
        return res.status(500).send(err.message);
    }
});

router.get('/:slug/dashboard', requireAdmin, requirePermission('settings'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const synagogue = await Synagogue.findOne({ slug: req.params.slug }).lean();
        await persistTitlesIfMissing(synagogue);
        const refreshed = await Synagogue.findOne({ slug: req.params.slug }).lean();
        const enriched = enrichSynagogueForAdmin(refreshed);
        renderAdmin(res, 'admin/dashboard', {
            synagogue: enriched,
            adminUser: req.adminUser,
            adminPermissions: req.adminPermissions,
            canSaveBoardSettings: canSaveBoardSettings(req.adminPermissions),
            boardTitles: enriched.titles,
            boardFeatureToggles: buildBoardFeatureToggles(enriched.boardFeatures),
            saved: req.query.saved === '1',
            error: req.query.error || null,
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Slideshow Management
router.get('/:slug/slideshow', requireAdmin, requirePermission('slideshow'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const synagogue = await Synagogue.findOne({ slug: req.params.slug });
        renderAdmin(res, 'admin/slideshow', {
            synagogue: enrichSynagogueForAdmin(synagogue),
            adminUser: req.adminUser,
            adminPermissions: req.adminPermissions,
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/:slug/slideshow/settings', requireAdmin, requirePermission('slideshow'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { enabled, interval, mainDuration } = req.body;
        await Synagogue.updateOne({ slug: req.params.slug }, {
            $set: {
                'slideshow.enabled': !!enabled,
                'slideshow.interval': parseInt(interval),
                'slideshow.mainDuration': parseInt(mainDuration)
            }
        });
        return res.json({ ok: true, slideshow: await fetchSlideshow(req.params.slug) });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

router.post('/:slug/slideshow/add', requireAdmin, requirePermission('slideshow'), upload.single('image'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { text } = req.body;
        if (!req.file) {
            return res.status(400).json({ ok: false, error: 'Image is required' });
        }
        const optimizedFilename = await optimizeUploadedImage(req.file.path, 'slideshow');
        await Synagogue.updateOne(
            { slug: req.params.slug },
            {
                $push: {
                    'slideshow.images': {
                        url: optimizedFilename,
                        text: sanitizeRichText(text)
                    }
                }
            }
        );
        return res.json({ ok: true, slideshow: await fetchSlideshow(req.params.slug) });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

router.post('/:slug/slideshow/edit', requireAdmin, requirePermission('slideshow'), upload.single('image'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { slideId, text } = req.body;
        const updateFields = {
            'slideshow.images.$.text': sanitizeRichText(text || ''),
        };

        if (req.file) {
            updateFields['slideshow.images.$.url'] = await optimizeUploadedImage(req.file.path, 'slideshow');
        }

        await Synagogue.updateOne(
            { slug: req.params.slug, 'slideshow.images._id': slideId },
            { $set: updateFields },
        );
        return res.json({ ok: true, slideshow: await fetchSlideshow(req.params.slug) });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

router.post('/:slug/slideshow/delete', requireAdmin, requirePermission('slideshow'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { slideId } = req.body;
        await Synagogue.updateOne(
            { slug: req.params.slug },
            { $pull: { 'slideshow.images': { _id: slideId } } }
        );
        return res.json({ ok: true, slideshow: await fetchSlideshow(req.params.slug) });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

router.get('/:slug/preview-board', requireAdmin, requirePermission('settings'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    const query = new URLSearchParams(req.query).toString();
    const target = `/s/${req.params.slug}${query ? `?${query}` : ''}`;
    return res.redirect(target);
});

function normalizeImportedPerson(raw, fallbackId) {
    const death = raw.gregorianDateOfDeath || raw.dateOfDeath || {};
    return {
        id: fallbackId,
        name: String(raw.name || '').trim(),
        text: sanitizeRichText(raw.text || ''),
        title: raw.title ? String(raw.title) : '',
        photo: raw.photo ? String(raw.photo) : '',
        gregorianDateOfDeath: {
            month: parseInt(death.month, 10) || 1,
            date: parseInt(death.date, 10) || 1,
            year: parseInt(death.year, 10) || 1900,
        },
    };
}

// People Management
router.get('/:slug/people', requireAdmin, requirePermission('people'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const synagogue = await Synagogue.findOne({ slug: req.params.slug });
        renderAdmin(res, 'admin/people', {
            synagogue: enrichSynagogueForAdmin(synagogue),
            adminUser: req.adminUser,
            adminPermissions: req.adminPermissions,
            imported: req.query.imported === '1',
            importError: req.query.importError === '1',
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/:slug/people/import', requireAdmin, requirePermission('people'), requirePermission('peopleImport'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        let payload = req.body.people;

        if (typeof req.body.json === 'string' && req.body.json.trim()) {
            payload = JSON.parse(req.body.json);
        }

        if (!Array.isArray(payload)) {
            throw new Error('Expected a JSON array of people');
        }

        const synagogue = await Synagogue.findOne({ slug: req.params.slug });
        const usedIds = new Set(synagogue.people.map((person) => person.id));
        let maxId = synagogue.people.reduce((max, person) => (person.id > max ? person.id : max), 0);

        const newPeople = payload
            .filter((raw) => raw && String(raw.name || '').trim())
            .map((raw) => {
                let id = parseInt(raw.id, 10);
                if (!Number.isFinite(id) || usedIds.has(id)) {
                    maxId += 1;
                    id = maxId;
                } else {
                    maxId = Math.max(maxId, id);
                }
                usedIds.add(id);
                return normalizeImportedPerson(raw, id);
            });

        if (newPeople.length > 0) {
            await Synagogue.updateOne(
                { slug: req.params.slug },
                { $push: { people: { $each: newPeople } } },
            );
        }

        return res.redirect(`/admin/${req.params.slug}/people?imported=1`);
    } catch (err) {
        console.error('People import error:', err);
        return res.redirect(`/admin/${req.params.slug}/people?importError=1`);
    }
});

router.post('/:slug/people/add', requireAdmin, requirePermission('people'), upload.single('photo'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { name, text, month, date, year } = req.body;
        const synagogue = await Synagogue.findOne({ slug: req.params.slug });
        const maxId = synagogue.people.reduce((max, p) => p.id > max ? p.id : max, 0);

        const newPerson = {
            id: maxId + 1,
            name,
            text: sanitizeRichText(text),
            gregorianDateOfDeath: { month: parseInt(month), date: parseInt(date), year: parseInt(year) },
            photo: req.file ? await optimizeUploadedImage(req.file.path, 'photo') : '',
            title: ''
        };

        await Synagogue.updateOne(
            { slug: req.params.slug },
            { $push: { people: newPerson } }
        );
        res.redirect(`/admin/${req.params.slug}/people`);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/:slug/people/edit', requireAdmin, requirePermission('people'), upload.single('photo'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { id, name, text, month, date, year, deletePhoto } = req.body;
        const personId = parseInt(id);

        const updateFields = {
            'people.$.name': name,
            'people.$.text': sanitizeRichText(text),
            'people.$.gregorianDateOfDeath': { month: parseInt(month), date: parseInt(date), year: parseInt(year) }
        };

        if (req.file) {
            updateFields['people.$.photo'] = await optimizeUploadedImage(req.file.path, 'photo');
        } else if (deletePhoto) {
            updateFields['people.$.photo'] = '';
        }

        await Synagogue.updateOne(
            { slug: req.params.slug, 'people.id': personId },
            { $set: updateFields }
        );
        res.redirect(`/admin/${req.params.slug}/people`);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/:slug/people/delete', requireAdmin, requirePermission('people'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { id } = req.body;
        await Synagogue.updateOne(
            { slug: req.params.slug },
            { $pull: { people: { id: parseInt(id) } } }
        );
        res.redirect(`/admin/${req.params.slug}/people`);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Community events (special days & announcements)
router.get('/:slug/events', requireAdmin, requirePermission('events'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const synagogue = await Synagogue.findOne({ slug: req.params.slug }).lean();
        const events = synagogue.communityEvents || [];
        const categorized = categorizeCommunityEvents(events);
        renderAdmin(res, 'admin/events', {
            synagogue: enrichSynagogueForAdmin(synagogue),
            adminUser: req.adminUser,
            adminPermissions: req.adminPermissions,
            events: categorized,
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/:slug/events/add', requireAdmin, requirePermission('events'), parseFormBody, async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const publishNow = req.body.publishNow === '1' || req.body.publishNow === 'true';
        const payload = buildCommunityEventPayload(req.body, { publishNow });
        payload.text = sanitizeRichText(payload.text);

        if (!payload.title) {
            return res.status(400).json({ ok: false, error: 'Title is required' });
        }

        await Synagogue.updateOne(
            { slug: req.params.slug },
            { $push: { communityEvents: payload } },
        );

        const events = await fetchCommunityEvents(req.params.slug);
        return res.json({ ok: true, events: categorizeCommunityEvents(events) });
    } catch (err) {
        return res.status(400).json({ ok: false, error: err.message });
    }
});

router.post('/:slug/events/edit', requireAdmin, requirePermission('events'), parseFormBody, async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { eventId } = req.body;
        const publishNow = req.body.publishNow === '1' || req.body.publishNow === 'true';
        const payload = buildCommunityEventPayload(req.body, { publishNow });
        payload.text = sanitizeRichText(payload.text);

        if (!payload.title) {
            return res.status(400).json({ ok: false, error: 'Title is required' });
        }

        await Synagogue.updateOne(
            { slug: req.params.slug, 'communityEvents._id': eventId },
            {
                $set: {
                    'communityEvents.$.title': payload.title,
                    'communityEvents.$.text': payload.text,
                    'communityEvents.$.eventDate': payload.eventDate,
                    'communityEvents.$.startAt': payload.startAt,
                    'communityEvents.$.endAt': payload.endAt,
                },
            },
        );

        const events = await fetchCommunityEvents(req.params.slug);
        return res.json({ ok: true, events: categorizeCommunityEvents(events) });
    } catch (err) {
        return res.status(400).json({ ok: false, error: err.message });
    }
});

router.post('/:slug/events/publish-now', requireAdmin, requirePermission('events'), parseFormBody, async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { eventId } = req.body;
        await Synagogue.updateOne(
            { slug: req.params.slug, 'communityEvents._id': eventId },
            { $set: { 'communityEvents.$.startAt': new Date() } },
        );

        const events = await fetchCommunityEvents(req.params.slug);
        return res.json({ ok: true, events: categorizeCommunityEvents(events) });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

router.post('/:slug/events/end-now', requireAdmin, requirePermission('events'), parseFormBody, async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { eventId } = req.body;
        await Synagogue.updateOne(
            { slug: req.params.slug, 'communityEvents._id': eventId },
            { $set: { 'communityEvents.$.endAt': new Date() } },
        );

        const events = await fetchCommunityEvents(req.params.slug);
        return res.json({ ok: true, events: categorizeCommunityEvents(events) });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

router.post('/:slug/events/delete', requireAdmin, requirePermission('events'), parseFormBody, async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { eventId } = req.body;
        await Synagogue.updateOne(
            { slug: req.params.slug },
            { $pull: { communityEvents: { _id: eventId } } },
        );

        const events = await fetchCommunityEvents(req.params.slug);
        return res.json({ ok: true, events: categorizeCommunityEvents(events) });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

router.get('/:slug/users', requireAdmin, requireFullAdmin, async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const synagogue = await Synagogue.findOne({ slug: req.params.slug }).lean();
        const translator = getTranslator(synagogue.adminLanguage || 'ru');
        renderAdmin(res, 'admin/users', {
            synagogue: enrichSynagogueForAdmin(synagogue),
            adminUser: req.adminUser,
            adminPermissions: req.adminPermissions,
            adminUsers: serializeAdminUsers(synagogue.adminUsers),
            permissionToggles: buildPermissionToggles({}, translator),
            settingsSectionToggles: buildSettingsSectionToggles({}, translator),
            saved: req.query.saved === '1',
            error: req.query.error || null,
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/:slug/users/add', requireAdmin, requireFullAdmin, parseFormBody, async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const username = normalizeAdminUsername(req.body.username);
        const displayName = String(req.body.displayName || req.body.username || '').trim();
        if (!username) {
            return res.redirect(`/admin/${req.params.slug}/users?error=missing_username`);
        }

        const synagogue = await Synagogue.findOne({ slug: req.params.slug }).lean();
        const existing = findAdminUser(synagogue, username);
        if (existing) {
            return res.redirect(`/admin/${req.params.slug}/users?error=duplicate_username`);
        }

        const permissions = permissionsForStorage(req.body);
        const adminLanguage = normalizeAdminLang(req.body.adminLanguage);
        const colorMode = req.body.colorMode === 'light' ? 'light' : 'dark';

        await Synagogue.updateOne({ slug: req.params.slug }, {
            $push: {
                adminUsers: {
                    username,
                    displayName: displayName || username,
                    permissions,
                    adminLanguage,
                    adminTheme: { colorMode },
                },
            },
        });

        return res.redirect(`/admin/${req.params.slug}/users?saved=1`);
    } catch (err) {
        return res.status(500).send(err.message);
    }
});

router.post('/:slug/users/edit', requireAdmin, requireFullAdmin, parseFormBody, async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { userId } = req.body;
        const username = normalizeAdminUsername(req.body.username);
        const displayName = String(req.body.displayName || req.body.username || '').trim();
        if (!userId || !username) {
            return res.redirect(`/admin/${req.params.slug}/users?error=missing_fields`);
        }

        const synagogue = await Synagogue.findOne({ slug: req.params.slug }).lean();
        const duplicate = (synagogue.adminUsers || []).find(
            (user) => String(user._id) !== String(userId)
                && normalizeAdminUsername(user.username) === username,
        );
        if (duplicate) {
            return res.redirect(`/admin/${req.params.slug}/users?error=duplicate_username`);
        }

        const permissions = permissionsForStorage(req.body);
        const adminLanguage = normalizeAdminLang(req.body.adminLanguage);
        const colorMode = req.body.colorMode === 'light' ? 'light' : 'dark';

        await Synagogue.updateOne(
            { slug: req.params.slug, 'adminUsers._id': userId },
            {
                $set: {
                    'adminUsers.$.username': username,
                    'adminUsers.$.displayName': displayName || username,
                    'adminUsers.$.permissions': permissions,
                    'adminUsers.$.adminLanguage': adminLanguage,
                    'adminUsers.$.adminTheme.colorMode': colorMode,
                },
            },
        );

        return res.redirect(`/admin/${req.params.slug}/users?saved=1`);
    } catch (err) {
        return res.status(500).send(err.message);
    }
});

router.post('/:slug/users/delete', requireAdmin, requireFullAdmin, parseFormBody, async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.redirect(`/admin/${req.params.slug}/users?error=missing_fields`);
        }

        await Synagogue.updateOne(
            { slug: req.params.slug },
            { $pull: { adminUsers: { _id: userId } } },
        );

        return res.redirect(`/admin/${req.params.slug}/users?saved=1`);
    } catch (err) {
        return res.status(500).send(err.message);
    }
});

module.exports = router;
