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
const { getAdminLocaleContext, normalizeAdminLang } = require('../lib/admin-locale');
const { BOARD_THEME_DEFAULTS } = require('../lib/board-defaults');
const { parsePhotoCropFromBody } = require('../lib/photo-crop');
const { parseBoardFeaturesFromBody } = require('../lib/board-features');
const {
  normalizeSnapshot,
  saveViewThumbnail,
  deleteScreenshot,
  buildApplyUpdate,
  findSavedView,
  normalizeSavedViews,
  repairSavedViewsInDb,
  serializeSavedViews,
} = require('../lib/saved-views');
const { parseMemorialQrPanelFromBody, memorialQrPanelToUpdate } = require('../lib/memorial-qr-panel');
const { parseFontScalesFromBody, normalizeTileOpacity, normalizeLogoBorderRadius } = require('../lib/theme-typography');
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
const { parsePublicSubmissionFromBody } = require('../lib/public-submission');
const { parsePersonContactsFromBody, normalizePersonContact, personContactsToLegacyFields, getPersonContacts, hasContactDetails } = require('../lib/person-contact');
const { parseContactImportFile } = require('../lib/google-contacts-import');
const {
    mergeContactDirectories,
    normalizeContactDirectory,
    searchContactDirectory,
    filterContactDirectory,
    findDirectoryEntry,
    addDirectoryEntry,
    updateDirectoryEntry,
    removeDirectoryEntry,
} = require('../lib/contact-directory');
const {
  parseYahrzeitRemindersFromBody,
  buildYahrzeitPageEntries,
  buildYahrzeitWeekMissedEntries,
  buildContactMessageEntry,
} = require('../lib/yahrzeit-reminders');
const { getDayKeyInTimezone, resolveSynagogueTimezone, buildYahrzeitEntries } = require('../lib/yahrzeit');
const { buildFaviconPath, resolveFaviconLogoFilename } = require('../lib/favicon');
const { OFFICIAL_LOGO_FILENAME } = require('../lib/board-defaults');
const { CANDLE_PALETTE_KEYS, normalizeCandlePalette } = require('../lib/candle-palette');
const { normalizeBoardFeatures } = require('../lib/board-features');

const BOARD_FEATURE_TOGGLE_META = [
  { key: 'sidebarNames', labelKey: 'feature_sidebar_names', helpKey: 'feature_sidebar_names_help' },
  { key: 'dailyChumash', labelKey: 'feature_daily_chumash', helpKey: 'feature_daily_chumash_help' },
  { key: 'dailyTehillim', labelKey: 'feature_daily_tehillim', helpKey: 'feature_daily_tehillim_help' },
  { key: 'dailyTanya', labelKey: 'feature_daily_tanya', helpKey: 'feature_daily_tanya_help' },
  { key: 'dailyRambam', labelKey: 'feature_daily_rambam', helpKey: 'feature_daily_rambam_help' },
  { key: 'hayomYom', labelKey: 'feature_hayom_yom', helpKey: 'feature_hayom_yom_help' },
  { key: 'upcomingHolidays', labelKey: 'feature_upcoming_holidays', helpKey: 'feature_upcoming_holidays_help' },
  { key: 'communityEvents', labelKey: 'feature_community_events', helpKey: 'feature_community_events_help' },
  { key: 'kelMaleRachamim', labelKey: 'feature_kel_male_rachamim', helpKey: 'feature_kel_male_rachamim_help' },
  { key: 'izkor', labelKey: 'feature_izkor', helpKey: 'feature_izkor_help' },
  { key: 'weather', labelKey: 'feature_weather', helpKey: 'feature_weather_help' },
  { key: 'sunriseSunset', labelKey: 'feature_sunrise_sunset', helpKey: 'feature_sunrise_sunset_help' },
  { key: 'officialLogo', labelKey: 'feature_official_logo', helpKey: 'feature_official_logo_help' },
];

const BOARD_FEATURE_GROUPS = [
  {
    groupKey: 'board_features_candle_group',
    helpKey: 'board_features_candle_group_help',
    keys: [],
    special: 'candle',
  },
  {
    groupKey: 'board_features_prayers_group',
    helpKey: 'board_features_prayers_group_help',
    keys: ['kelMaleRachamim', 'izkor'],
  },
  {
    groupKey: 'board_features_sidebar_group',
    helpKey: 'board_features_sidebar_group_help',
    keys: ['officialLogo', 'sidebarNames', 'upcomingHolidays', 'communityEvents', 'weather', 'sunriseSunset'],
  },
  {
    groupKey: 'board_features_learning_group',
    helpKey: 'board_features_learning_group_help',
    keys: ['dailyChumash', 'dailyTehillim', 'dailyTanya', 'dailyRambam', 'hayomYom'],
  },
  {
    groupKey: 'board_features_public_submission_group',
    helpKey: 'board_features_public_submission_group_help',
    keys: [],
    special: 'publicSubmission',
  },
];

const FONT_SCALE_SLIDER_META = [
  { key: 'tileTitle', labelKey: 'font_scale_tile_title', helpKey: 'font_scale_tile_title_help' },
  { key: 'tileDate', labelKey: 'font_scale_tile_date', helpKey: 'font_scale_tile_date_help' },
  { key: 'boardHeader', labelKey: 'font_scale_board_header', helpKey: 'font_scale_board_header_help' },
  { key: 'sidebar', labelKey: 'font_scale_sidebar', helpKey: 'font_scale_sidebar_help' },
  { key: 'clock', labelKey: 'font_scale_clock', helpKey: 'font_scale_clock_help' },
  { key: 'prayers', labelKey: 'font_scale_prayers', helpKey: 'font_scale_prayers_help' },
  { key: 'prayerOverlay', labelKey: 'font_scale_prayer_overlay', helpKey: 'font_scale_prayer_overlay_help' },
  { key: 'torahNames', labelKey: 'font_scale_torah_names', helpKey: 'font_scale_torah_names_help', min: 100, max: 400, step: 10 },
  { key: 'weather', labelKey: 'font_scale_weather', helpKey: 'font_scale_weather_help' },
  { key: 'shabbat', labelKey: 'font_scale_shabbat', helpKey: 'font_scale_shabbat_help' },
  { key: 'candle', labelKey: 'font_scale_candle', helpKey: 'font_scale_candle_help', min: 40, max: 150, step: 5 },
];

const TEXTS_FONT_SCALE_GROUPS = [
  {
    groupKey: 'typography_center_column',
    helpKey: 'typography_center_column_help',
    keys: ['tileTitle', 'tileDate', 'boardHeader', 'torahNames', 'prayerOverlay'],
  },
  {
    groupKey: 'typography_left_column',
    helpKey: 'typography_left_column_help',
    keys: ['prayers'],
  },
  {
    groupKey: 'typography_right_column',
    helpKey: 'typography_right_column_help',
    keys: ['sidebar', 'clock', 'weather', 'shabbat'],
  },
];

function buildCandlePaletteOptions() {
  return CANDLE_PALETTE_KEYS.map((key) => ({
    key,
    labelKey: `candle_palette_${key}`,
  }));
}

function buildBoardFeatureToggles(boardFeatures) {
  const features = boardFeatures || {};
  const byKey = {};

  BOARD_FEATURE_TOGGLE_META.forEach((entry) => {
    byKey[entry.key] = {
      ...entry,
      enabled: features[entry.key] !== false,
    };
  });

  return byKey;
}

function buildBoardFeatureGroups(boardFeatures, theme, synagogue) {
  const togglesByKey = buildBoardFeatureToggles(boardFeatures);
  const fontScales = theme?.fontScales || {};
  const candleSlider = buildFontScaleSlider(
    FONT_SCALE_SLIDER_META.find((entry) => entry.key === 'candle'),
    fontScales,
  );

  return BOARD_FEATURE_GROUPS.map((group) => ({
    groupKey: group.groupKey,
    helpKey: group.helpKey,
    special: group.special || '',
    toggles: group.keys.map((key) => togglesByKey[key]).filter(Boolean),
    candleSlider,
    synagogueSlug: synagogue?.slug || '',
    shabbatTimesEnabled: synagogue?.shabbatTimesEnabled === true,
    publicSubmissionEnabled: synagogue?.publicSubmission?.enabled === true,
  }));
}

function buildFontScaleSlider(entry, fontScales) {
  const scales = fontScales || {};

  return {
    ...entry,
    value: scales[entry.key] != null ? scales[entry.key] : 100,
  };
}

function buildFontScaleGroups(fontScales, groups) {
  const metaByKey = {};
  FONT_SCALE_SLIDER_META.forEach((entry) => {
    metaByKey[entry.key] = entry;
  });

  return groups.map((group) => ({
    groupKey: group.groupKey,
    helpKey: group.helpKey,
    sliders: group.keys.map((key) => buildFontScaleSlider(metaByKey[key], fontScales)).filter(Boolean),
  }));
}

function buildTextsFontScaleGroups(fontScales) {
  return buildFontScaleGroups(fontScales, TEXTS_FONT_SCALE_GROUPS);
}

function canManageSavedViews(permissions) {
  return !!(
    permissions.settingsAppearance
    || permissions.settingsPreview
    || permissions.settingsSavedViews
  );
}

function canApplySavedViews(permissions) {
  return !!(
    permissions.settingsAppearance
    || permissions.settingsPreview
    || permissions.settingsSavedViews
  );
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

const contactImportUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const name = String(file.originalname || '').toLowerCase();
        const allowed = name.endsWith('.csv')
            || name.endsWith('.vcf')
            || name.endsWith('.txt')
            || (file.mimetype && (
                file.mimetype.includes('text/')
                || file.mimetype.includes('csv')
                || file.mimetype.includes('vcard')
            ));
        if (!allowed) {
            return cb(new Error('Only CSV or vCard contact files are allowed'));
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
        if (req.session.adminSlug && slug === req.session.adminSlug) {
            await repairSavedViewsInDb(slug);
        }
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

function requireAnyPermission(...permissionKeys) {
    return (req, res, next) => {
        if (req.params.slug !== req.session.adminSlug) {
            return res.status(403).send('Forbidden');
        }

        const permissions = req.adminPermissions || FULL_ADMIN_PERMISSIONS;
        const allowed = permissionKeys.some((key) => permissionAllows(permissions, key));
        if (!allowed) {
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

const ADMIN_NAV_BY_VIEW = {
    'admin/dashboard': 'settings',
    'admin/yahrzeit': 'yahrzeit',
    'admin/people': 'people',
    'admin/contacts': 'contact-directory',
    'admin/events': 'events',
    'admin/users': 'users',
};

function renderAdmin(res, view, options = {}) {
    const synagogue = options.synagogue;
    const adminUser = options.adminUser || null;
    const displaySynagogue = applyUserDisplaySettings(
        enrichSynagogueForAdmin(synagogue),
        adminUser,
    );
    const locale = getAdminLocaleContext(displaySynagogue && displaySynagogue.adminLanguage);
    const yahrzeitTodayCount = buildYahrzeitEntries(displaySynagogue).length;

    res.render(view, {
        ...options,
        synagogue: displaySynagogue,
        adminUser,
        adminPermissions: options.adminPermissions || FULL_ADMIN_PERMISSIONS,
        adminTranslate: getTranslator(locale.adminLanguage),
        adminDir: locale.adminDir,
        adminIsRtl: locale.adminIsRtl,
        yahrzeitTodayCount,
        officialLogoUrl: `/images/${OFFICIAL_LOGO_FILENAME}`,
        faviconUrl: buildFaviconPath(displaySynagogue.slug, { badge: false }),
        faviconAlertUrl: buildFaviconPath(displaySynagogue.slug, { badge: true }),
        adminNavActive: options.adminNavActive || ADMIN_NAV_BY_VIEW[view] || '',
        layout: options.layout === false ? false : (options.layout || 'admin'),
    });
}

function wantsJson(req) {
    return req.get('X-Requested-With') === 'XMLHttpRequest' || req.query.ajax === '1';
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
    { name: 'tilesBackground', maxCount: 1 },
    { name: 'donationQrImage', maxCount: 1 },
    { name: 'registrationQrImage', maxCount: 1 },
]), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const permissions = req.adminPermissions || FULL_ADMIN_PERMISSIONS;
        const {
            titleRu, titleEn, titleHe, primaryColor, textColor, accentColor, tileColor, tileOpacity,
            language, shabbatTimesEnabled, candlePalette, logoBorderRadius,
        } = req.body;
        const synagogue = await Synagogue.findOne({ slug: req.params.slug }).lean();
        const boardFeatures = parseBoardFeaturesFromBody(req.body);
        const publicSubmission = parsePublicSubmissionFromBody(req.body);
        const fontScales = parseFontScalesFromBody(req.body, synagogue?.theme?.fontScales);
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
            updateData['theme.tileColor'] = sanitizeHexColor(tileColor, BOARD_THEME_DEFAULTS.tileColor);
            updateData['theme.tileOpacity'] = normalizeTileOpacity(tileOpacity);
            updateData['theme.candlePalette'] = normalizeCandlePalette(candlePalette);
            if ('logoBorderRadius' in req.body) {
                updateData['theme.logoBorderRadius'] = normalizeLogoBorderRadius(logoBorderRadius);
            }
            Object.entries(fontScales).forEach(([key, value]) => {
                updateData[`theme.fontScales.${key}`] = value;
            });
            Object.assign(updateData, memorialQrPanelToUpdate(parseMemorialQrPanelFromBody(req.body)));
            if ('publicSubmissionDonationUrl' in req.body) {
                updateData['publicSubmission.donationUrl'] = publicSubmission.donationUrl || '';
            }
        }

        if (permissions.settingsLanguages) {
            updateData.language = language;
        }

        if (permissions.settingsFeatures) {
            if ('shabbatTimesEnabled' in req.body) {
                updateData.shabbatTimesEnabled = !!shabbatTimesEnabled;
            }
            Object.assign(updateData, Object.fromEntries(
                Object.entries(boardFeatures).map(([key, value]) => [`boardFeatures.${key}`, value]),
            ));
            if ('publicSubmissionEnabled' in req.body) {
                updateData['publicSubmission.enabled'] = !!publicSubmission.enabled;
            }
        }

        if (permissions.settingsBranding && req.files['logo']) {
            updateData['theme.logo'] = await optimizeUploadedImage(req.files['logo'][0].path, 'logo');
        }
        if (permissions.settingsAppearance && req.files['backgroundImage']) {
            updateData['theme.backgroundImage'] = await optimizeUploadedImage(req.files['backgroundImage'][0].path, 'background');
        }
        if (permissions.settingsAppearance && req.files['tilesBackground']) {
            updateData['theme.tilesBackground'] = await optimizeUploadedImage(req.files['tilesBackground'][0].path, 'tilesBackground');
        }
        if (permissions.settingsAppearance && req.files['donationQrImage']) {
            updateData['publicSubmission.donationQrImage'] = await optimizeUploadedImage(req.files['donationQrImage'][0].path, 'qr');
        }
        if (permissions.settingsAppearance && req.files['registrationQrImage']) {
            updateData['publicSubmission.registrationQrImage'] = await optimizeUploadedImage(req.files['registrationQrImage'][0].path, 'qr');
        }

        if (Object.keys(updateData).length > 0) {
            await Synagogue.updateOne({ slug: req.params.slug }, { $set: updateData });
        }
        res.redirect(`/admin/${req.params.slug}/dashboard?saved=1`);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/:slug/settings/saved-views', requireAdmin, requirePermission('settings'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).json({ ok: false, error: 'Forbidden' });
    const permissions = req.adminPermissions || FULL_ADMIN_PERMISSIONS;
    if (!canManageSavedViews(permissions)) {
        return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

    try {
        const synagogue = await Synagogue.findOne({ slug: req.params.slug });
        if (!synagogue) {
            return res.status(404).json({ ok: false, error: 'Not found' });
        }

        const name = String(req.body.name || '').trim();
        if (!name) {
            return res.status(400).json({ ok: false, error: 'Name is required' });
        }

        const snapshot = normalizeSnapshot({
            ...req.body,
            logo: synagogue.theme?.logo || '',
            backgroundImage: synagogue.theme?.backgroundImage || '',
            tilesBackground: synagogue.theme?.tilesBackground || '',
            publicSubmission: {
                enabled: req.body.publicSubmissionEnabled,
                donationUrl: req.body.publicSubmissionDonationUrl,
                donationQrImage: synagogue.publicSubmission?.donationQrImage || '',
                registrationQrImage: synagogue.publicSubmission?.registrationQrImage || '',
            },
        }, synagogue);
        const screenshot = await saveViewThumbnail(snapshot, req.body.screenshotDataUrl);
        const view = {
            id: require('crypto').randomUUID(),
            name,
            savedAt: new Date(),
            screenshot,
            snapshot,
        };

        const savedViews = normalizeSavedViews(synagogue.savedViews);
        savedViews.unshift(view);

        const themeUpdate = buildApplyUpdate(snapshot);
        await Synagogue.updateOne(
            { slug: req.params.slug },
            {
                $set: {
                    ...themeUpdate,
                    activeSavedViewId: view.id,
                    savedViews,
                },
            },
            { runValidators: false },
        );

        return res.json({ ok: true, view, resetTypography: true });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

router.post('/:slug/settings/saved-views/:viewId/apply', requireAdmin, requirePermission('settings'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).json({ ok: false, error: 'Forbidden' });
    const permissions = req.adminPermissions || FULL_ADMIN_PERMISSIONS;
    if (!canApplySavedViews(permissions)) {
        return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

    try {
        const synagogue = await Synagogue.findOne({ slug: req.params.slug }).lean();
        const view = findSavedView(synagogue?.savedViews, req.params.viewId);
        if (!view) {
            return res.status(404).json({ ok: false, error: 'View not found' });
        }

        const update = buildApplyUpdate(view.snapshot);
        if (permissions.settingsLanguages && view.snapshot.language) {
            update.language = view.snapshot.language;
        }

        await Synagogue.updateOne({ slug: req.params.slug }, { $set: { ...update, activeSavedViewId: req.params.viewId } });
        return res.json({
            ok: true,
            activeSavedViewId: req.params.viewId,
            viewName: view.name,
            snapshot: view.snapshot,
        });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

router.put('/:slug/settings/saved-views/:viewId', requireAdmin, requirePermission('settings'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).json({ ok: false, error: 'Forbidden' });
    const permissions = req.adminPermissions || FULL_ADMIN_PERMISSIONS;
    if (!canManageSavedViews(permissions)) {
        return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

    try {
        const synagogue = await Synagogue.findOne({ slug: req.params.slug });
        if (!synagogue) {
            return res.status(404).json({ ok: false, error: 'Not found' });
        }

        const normalizedViews = normalizeSavedViews(synagogue.savedViews);
        const viewIndex = normalizedViews.findIndex((entry) => entry.id === req.params.viewId);
        if (viewIndex === -1) {
            return res.status(404).json({ ok: false, error: 'View not found' });
        }

        const existing = normalizedViews[viewIndex];
        const snapshot = normalizeSnapshot({
            ...req.body,
            logo: synagogue.theme?.logo || existing.snapshot?.theme?.logo || '',
            backgroundImage: synagogue.theme?.backgroundImage || existing.snapshot?.theme?.backgroundImage || '',
            tilesBackground: synagogue.theme?.tilesBackground || existing.snapshot?.theme?.tilesBackground || '',
            publicSubmission: {
                enabled: req.body.publicSubmissionEnabled,
                donationUrl: req.body.publicSubmissionDonationUrl,
                donationQrImage: synagogue.publicSubmission?.donationQrImage
                    || existing.snapshot?.publicSubmission?.donationQrImage
                    || '',
                registrationQrImage: synagogue.publicSubmission?.registrationQrImage
                    || existing.snapshot?.publicSubmission?.registrationQrImage
                    || '',
            },
        }, synagogue);
        const screenshot = await saveViewThumbnail(snapshot, req.body.screenshotDataUrl);
        if (existing.screenshot && existing.screenshot !== screenshot) {
            deleteScreenshot(existing.screenshot);
        }

        normalizedViews[viewIndex] = {
            ...existing,
            savedAt: new Date(),
            screenshot,
            snapshot,
        };

        const themeUpdate = buildApplyUpdate(snapshot);
        await Synagogue.updateOne(
            { slug: req.params.slug },
            {
                $set: {
                    ...themeUpdate,
                    activeSavedViewId: req.params.viewId,
                    savedViews: normalizedViews,
                },
            },
            { runValidators: false },
        );

        return res.json({ ok: true, view: normalizedViews[viewIndex], resetTypography: true });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

router.delete('/:slug/settings/saved-views/:viewId', requireAdmin, requirePermission('settings'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).json({ ok: false, error: 'Forbidden' });
    const permissions = req.adminPermissions || FULL_ADMIN_PERMISSIONS;
    if (!canManageSavedViews(permissions)) {
        return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

    try {
        const synagogue = await Synagogue.findOne({ slug: req.params.slug }).lean();
        if (!synagogue) {
            return res.status(404).json({ ok: false, error: 'Not found' });
        }

        const view = findSavedView(synagogue.savedViews, req.params.viewId);
        if (view && view.screenshot) {
            deleteScreenshot(view.screenshot);
        }

        const savedViews = normalizeSavedViews(synagogue.savedViews)
            .filter((entry) => entry.id !== req.params.viewId);
        const update = { savedViews };
        if (synagogue.activeSavedViewId === req.params.viewId) {
            update.activeSavedViewId = '';
        }

        await Synagogue.updateOne({ slug: req.params.slug }, { $set: update }, { runValidators: false });
        return res.json({ ok: true });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
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
                'theme.tileColor': BOARD_THEME_DEFAULTS.tileColor,
                'theme.tileOpacity': BOARD_THEME_DEFAULTS.tileOpacity,
                'theme.fontScales.tileTitle': 100,
                'theme.fontScales.tileDate': 100,
                'theme.fontScales.clock': 100,
                'theme.fontScales.boardHeader': 100,
                'theme.fontScales.sidebar': 100,
                'theme.fontScales.prayers': 100,
                'theme.fontScales.prayerOverlay': 100,
                'theme.fontScales.torahNames': 100,
                'theme.fontScales.weather': 100,
                'theme.fontScales.shabbat': 100,
                'theme.fontScales.candle': 75,
                'theme.candlePalette': 'classic',
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
        const activeSavedView = findSavedView(enriched.savedViews, enriched.activeSavedViewId);
        renderAdmin(res, 'admin/dashboard', {
            synagogue: enriched,
            adminUser: req.adminUser,
            adminPermissions: req.adminPermissions,
            canSaveBoardSettings: canSaveBoardSettings(req.adminPermissions),
            boardTitles: enriched.titles,
            boardFeatureGroups: buildBoardFeatureGroups(enriched.boardFeatures, enriched.theme, enriched),
            textsFontScaleGroups: buildTextsFontScaleGroups(enriched.theme.fontScales),
            candlePaletteOptions: buildCandlePaletteOptions(),
            candleSlider: buildFontScaleSlider(
                FONT_SCALE_SLIDER_META.find((entry) => entry.key === 'candle'),
                enriched.theme.fontScales,
            ),
            savedViews: serializeSavedViews(enriched.savedViews),
            activeSavedViewId: enriched.activeSavedViewId || '',
            activeSavedViewName: activeSavedView ? activeSavedView.name : '',
            memorialQrPanel: enriched.memorialQrPanel,
            saved: req.query.saved === '1',
            error: req.query.error || null,
        });
    } catch (err) {
        res.status(500).send(err.message);
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
    const person = {
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
        contact: normalizePersonContact(raw.contact || {
            name: raw.contactName,
            phone: raw.contactPhone,
            email: raw.contactEmail,
            platform: raw.contactPlatform,
        }),
        contacts: Array.isArray(raw.contacts)
            ? raw.contacts.map(normalizePersonContact).filter((entry) => entry.name || entry.phone || entry.email)
            : undefined,
    };

    const legacy = personContactsToLegacyFields(
        person.contacts && person.contacts.length
            ? person.contacts
            : (hasContactDetails(person.contact) ? [person.contact] : []),
    );
    person.contact = legacy.contact;
    person.contacts = legacy.contacts;
    return person;
}

// People Management
router.post('/:slug/yahrzeit/settings', requireAdmin, requirePermission('people'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const includeHebrew = req.body.yahrzeitRemindersIncludeHebrew === '1'
            || req.body.yahrzeitRemindersIncludeHebrew === 'on';
        await Synagogue.updateOne({ slug: req.params.slug }, {
            $set: {
                'yahrzeitReminders.includeHebrewYahrzeit': includeHebrew,
            },
        });
        return res.redirect(`/admin/${req.params.slug}/yahrzeit?saved=1`);
    } catch (err) {
        return res.status(500).send(err.message);
    }
});

router.get('/:slug/yahrzeit', requireAdmin, requirePermission('people'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const synagogue = await Synagogue.findOne({ slug: req.params.slug }).lean();
        const enriched = enrichSynagogueForAdmin(synagogue);
        const displaySynagogue = applyUserDisplaySettings(enriched, req.adminUser);
        const entries = buildYahrzeitPageEntries(enriched, new Date(), displaySynagogue.adminLanguage);
        const weekEntries = buildYahrzeitWeekMissedEntries(enriched, new Date(), displaySynagogue.adminLanguage);
        const timezone = resolveSynagogueTimezone(enriched);
        const todayLabel = getDayKeyInTimezone(timezone);
        const yahrzeitPeople = (enriched.people || []).filter((person) => (
            entries.some((entry) => entry.id === person.id)
            || weekEntries.some((entry) => entry.id === person.id)
        ));

        renderAdmin(res, 'admin/yahrzeit', {
            synagogue: enriched,
            adminUser: req.adminUser,
            adminPermissions: req.adminPermissions,
            entries,
            weekEntries,
            yahrzeitPeople,
            todayLabel,
            saved: req.query.saved === '1',
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Yahrzeit tile image for sharing
router.get('/:slug/yahrzeit/tile/:personId.png', requireAdmin, requirePermission('people'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const synagogue = await Synagogue.findOne({ slug: req.params.slug }).lean();
        if (!synagogue) {
            return res.status(404).send('Not found');
        }

        const personId = Number(req.params.personId);
        const person = (synagogue.people || []).find((entry) => entry.id === personId);
        if (!person) {
            return res.status(404).send('Not found');
        }

        const enriched = enrichSynagogueForAdmin(synagogue);
        const entries = buildYahrzeitPageEntries(enriched, new Date(), synagogue.adminLanguage);
        const entry = entries.find((item) => item.id === personId);
        const datesLine = entry
          ? [entry.gregorianDateLabel, entry.hebrewDateLabel].filter(Boolean).join(' · ')
          : '';

        const { renderYahrzeitTilePng } = require('../lib/yahrzeit-tile-image');
        const buffer = await renderYahrzeitTilePng({
            name: person.name,
            datesLine,
            photoFilename: person.photo,
            theme: synagogue.theme,
        });

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'private, max-age=300');
        return res.send(buffer);
    } catch (err) {
        return res.status(500).send(err.message);
    }
});

router.get('/:slug/people/message/:personId.json', requireAdmin, requirePermission('people'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const synagogue = await Synagogue.findOne({ slug: req.params.slug }).lean();
        if (!synagogue) {
            return res.status(404).json({ ok: false });
        }

        const personId = Number(req.params.personId);
        const person = (synagogue.people || []).find((entry) => entry.id === personId);
        if (!person) {
            return res.status(404).json({ ok: false });
        }

        const enriched = enrichSynagogueForAdmin(synagogue);
        const displaySynagogue = applyUserDisplaySettings(enriched, req.adminUser);
        const contactIndex = Number.parseInt(req.query.contactIndex, 10);
        const contacts = getPersonContacts(person);
        const selectedContact = Number.isFinite(contactIndex) && contactIndex >= 0
            ? contacts[contactIndex]
            : contacts[0];

        if (!selectedContact) {
            return res.json({ ok: true, preparedMessage: '', contactLink: '', tileUrl: '', canSend: false });
        }

        const entry = buildContactMessageEntry(enriched, {
            ...person,
            contact: selectedContact,
            contacts,
        }, {
            adminLanguage: displaySynagogue.adminLanguage,
            missed: req.query.missed === '1',
        });

        return res.json({
            ok: true,
            preparedMessage: entry.preparedMessage,
            contactLink: entry.contactLink,
            tileUrl: entry.tileUrl,
            canSend: !!entry.contactLink,
            contactIndex: Number.isFinite(contactIndex) ? contactIndex : 0,
            contactName: selectedContact.name || '',
        });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

router.get('/:slug/people', requireAdmin, requirePermission('people'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const synagogue = await Synagogue.findOne({ slug: req.params.slug });
        const enriched = enrichSynagogueForAdmin(synagogue);
        enriched.contactDirectoryCount = normalizeContactDirectory(enriched.contactDirectory).length;
        renderAdmin(res, 'admin/people', {
            synagogue: enriched,
            adminUser: req.adminUser,
            adminPermissions: req.adminPermissions,
            imported: req.query.imported === '1',
            importError: req.query.importError === '1',
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.get('/:slug/contact-directory', requireAdmin, requirePermission('contactDirectory'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const synagogue = await Synagogue.findOne({ slug: req.params.slug });
        const enriched = enrichSynagogueForAdmin(synagogue);
        enriched.contactDirectoryCount = normalizeContactDirectory(enriched.contactDirectory).length;
        renderAdmin(res, 'admin/contacts', {
            synagogue: enriched,
            adminUser: req.adminUser,
            adminPermissions: req.adminPermissions,
            contactsImported: req.query.contactsImported === '1',
            contactsImportError: req.query.contactsImportError === '1',
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.get('/:slug/contacts/search', requireAdmin, requireAnyPermission('people', 'contactDirectory'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).json({ ok: false, error: 'Forbidden' });
    try {
        const synagogue = await Synagogue.findOne({ slug: req.params.slug }).lean();
        if (!synagogue) {
            return res.status(404).json({ ok: false, error: 'Not found' });
        }

        const results = searchContactDirectory(synagogue.contactDirectory, req.query.q, 12);
        return res.json({ ok: true, results });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

router.get('/:slug/contacts', requireAdmin, requirePermission('contactDirectory'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).json({ ok: false, error: 'Forbidden' });
    try {
        const synagogue = await Synagogue.findOne({ slug: req.params.slug }).lean();
        if (!synagogue) {
            return res.status(404).json({ ok: false, error: 'Not found' });
        }

        const contacts = filterContactDirectory(synagogue.contactDirectory, req.query.q);
        const total = normalizeContactDirectory(synagogue.contactDirectory).length;
        return res.json({ ok: true, contacts, total });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

router.post('/:slug/contacts', requireAdmin, requirePermission('contactDirectory'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).json({ ok: false, error: 'Forbidden' });
    try {
        const synagogue = await Synagogue.findOne({ slug: req.params.slug });
        if (!synagogue) {
            return res.status(404).json({ ok: false, error: 'Not found' });
        }

        const before = normalizeContactDirectory(synagogue.contactDirectory);
        const contactDirectory = addDirectoryEntry(synagogue.contactDirectory, req.body || {});
        const after = normalizeContactDirectory(contactDirectory);
        const added = after.find((entry) => !before.some((item) => item.id === entry.id))
            || after[after.length - 1];

        await Synagogue.updateOne(
            { slug: req.params.slug },
            { $set: { contactDirectory: after } },
            { runValidators: false },
        );

        return res.json({ ok: true, contact: added, total: after.length });
    } catch (err) {
        return res.status(400).json({ ok: false, error: err.message });
    }
});

router.put('/:slug/contacts/:contactId', requireAdmin, requirePermission('contactDirectory'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).json({ ok: false, error: 'Forbidden' });
    try {
        const synagogue = await Synagogue.findOne({ slug: req.params.slug });
        if (!synagogue) {
            return res.status(404).json({ ok: false, error: 'Not found' });
        }

        const contactDirectory = updateDirectoryEntry(
            synagogue.contactDirectory,
            req.params.contactId,
            req.body || {},
        );
        const contact = findDirectoryEntry(contactDirectory, req.params.contactId);

        await Synagogue.updateOne(
            { slug: req.params.slug },
            { $set: { contactDirectory } },
            { runValidators: false },
        );

        return res.json({ ok: true, contact, total: contactDirectory.length });
    } catch (err) {
        const status = /not found/i.test(err.message) ? 404 : 400;
        return res.status(status).json({ ok: false, error: err.message });
    }
});

router.delete('/:slug/contacts/:contactId', requireAdmin, requirePermission('contactDirectory'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).json({ ok: false, error: 'Forbidden' });
    try {
        const synagogue = await Synagogue.findOne({ slug: req.params.slug });
        if (!synagogue) {
            return res.status(404).json({ ok: false, error: 'Not found' });
        }

        const contactDirectory = removeDirectoryEntry(synagogue.contactDirectory, req.params.contactId);
        await Synagogue.updateOne(
            { slug: req.params.slug },
            { $set: { contactDirectory } },
            { runValidators: false },
        );

        return res.json({ ok: true, total: contactDirectory.length });
    } catch (err) {
        const status = /not found/i.test(err.message) ? 404 : 400;
        return res.status(status).json({ ok: false, error: err.message });
    }
});

router.post('/:slug/contacts/import', requireAdmin, requirePermission('contactDirectory'), contactImportUpload.single('file'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).json({ ok: false, error: 'Forbidden' });

    const wantsJson = req.get('X-Requested-With') === 'XMLHttpRequest'
        || String(req.headers.accept || '').includes('application/json');

    try {
        const synagogue = await Synagogue.findOne({ slug: req.params.slug });
        if (!synagogue) {
            return res.status(404).json({ ok: false, error: 'Not found' });
        }

        let parsed = [];
        if (req.file && req.file.buffer) {
            parsed = parseContactImportFile(req.file.buffer, req.file.originalname);
        } else if (typeof req.body.text === 'string' && req.body.text.trim()) {
            parsed = parseContactImportFile(Buffer.from(req.body.text, 'utf8'), 'contacts.csv');
        }

        if (!parsed.length) {
            const message = 'No contacts found in file';
            if (wantsJson) {
                return res.status(400).json({ ok: false, error: message });
            }
            return res.redirect(`/admin/${req.params.slug}/contact-directory?contactsImportError=1`);
        }

        const beforeCount = normalizeContactDirectory(synagogue.contactDirectory).length;
        const merged = mergeContactDirectories(synagogue.contactDirectory, parsed);
        const importedCount = merged.length - beforeCount;

        await Synagogue.updateOne(
            { slug: req.params.slug },
            { $set: { contactDirectory: merged } },
            { runValidators: false },
        );

        if (wantsJson) {
            return res.json({
                ok: true,
                imported: importedCount,
                total: merged.length,
                updated: parsed.length - importedCount,
            });
        }

        return res.redirect(`/admin/${req.params.slug}/contact-directory?contactsImported=1`);
    } catch (err) {
        console.error('Contact import error:', err);
        if (wantsJson) {
            return res.status(500).json({ ok: false, error: err.message });
        }
        return res.redirect(`/admin/${req.params.slug}/contact-directory?contactsImportError=1`);
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
        const contacts = parsePersonContactsFromBody(req.body);
        const legacy = personContactsToLegacyFields(contacts);
        const synagogue = await Synagogue.findOne({ slug: req.params.slug });
        const maxId = synagogue.people.reduce((max, p) => p.id > max ? p.id : max, 0);

        const newPerson = {
            id: maxId + 1,
            name,
            text: sanitizeRichText(text),
            gregorianDateOfDeath: { month: parseInt(month), date: parseInt(date), year: parseInt(year) },
            photo: req.file ? await optimizeUploadedImage(req.file.path, 'photo') : '',
            photoCrop: req.file ? parsePhotoCropFromBody(req.body) : undefined,
            title: '',
            contact: legacy.contact,
            contacts: legacy.contacts,
        };

        await Synagogue.updateOne(
            { slug: req.params.slug },
            { $push: { people: newPerson } }
        );

        if (wantsJson(req)) {
            return res.json({ ok: true, person: newPerson });
        }

        res.redirect(`/admin/${req.params.slug}/people`);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/:slug/people/edit', requireAdmin, requirePermission('people'), upload.single('photo'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { id, name, text, month, date, year, deletePhoto } = req.body;
        const contacts = parsePersonContactsFromBody(req.body);
        const legacy = personContactsToLegacyFields(contacts);
        const personId = parseInt(id);

        const updateFields = {
            'people.$.name': name,
            'people.$.text': sanitizeRichText(text),
            'people.$.gregorianDateOfDeath': { month: parseInt(month), date: parseInt(date), year: parseInt(year) },
            'people.$.contact': legacy.contact,
            'people.$.contacts': legacy.contacts,
        };

        if (req.file) {
            updateFields['people.$.photo'] = await optimizeUploadedImage(req.file.path, 'photo');
            updateFields['people.$.photoCrop'] = parsePhotoCropFromBody(req.body);
        } else if (deletePhoto) {
            updateFields['people.$.photo'] = '';
            updateFields['people.$.photoCrop'] = { x: 50, y: 50, zoom: 1 };
        } else {
            updateFields['people.$.photoCrop'] = parsePhotoCropFromBody(req.body);
        }

        await Synagogue.updateOne(
            { slug: req.params.slug, 'people.id': personId },
            { $set: updateFields }
        );

        if (wantsJson(req)) {
            const updated = await Synagogue.findOne(
                { slug: req.params.slug, 'people.id': personId },
                { 'people.$': 1 },
            ).lean();
            const person = updated && updated.people && updated.people[0];
            return res.json({ ok: true, person });
        }

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

        const updateSet = {
          'communityEvents.$.title': payload.title,
          'communityEvents.$.text': payload.text,
          'communityEvents.$.titles.ru': payload.titles.ru,
          'communityEvents.$.titles.en': payload.titles.en,
          'communityEvents.$.titles.he': payload.titles.he,
          'communityEvents.$.texts.ru': payload.texts.ru,
          'communityEvents.$.texts.en': payload.texts.en,
          'communityEvents.$.texts.he': payload.texts.he,
          'communityEvents.$.startAt': payload.startAt,
          'communityEvents.$.endAt': payload.endAt || null,
        };

        if (payload.eventDate) {
          updateSet['communityEvents.$.eventDate'] = payload.eventDate;
        }

        const updateDoc = { $set: updateSet };

        if (!payload.eventDate) {
          updateDoc.$unset = { 'communityEvents.$.eventDate': '' };
        }

        await Synagogue.updateOne(
            { slug: req.params.slug, 'communityEvents._id': eventId },
            updateDoc,
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
