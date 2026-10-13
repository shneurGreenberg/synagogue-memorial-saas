const express = require('express');
const router = express.Router();
const Synagogue = require('../models/Synagogue');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyPassword, ensureHashed } = require('../lib/password');
const { sanitizeRichText } = require('../lib/sanitize');
const { enrichSynagogueForAdmin, normalizeTitles, sanitizeHexColor, resolveAdminColorMode } = require('../lib/admin-theme');
const { getTranslator } = require('../lib/admin-translations');
const { getAdminLocaleContext, normalizeAdminLang } = require('../lib/admin-locale');
const { BOARD_THEME_DEFAULTS } = require('../lib/board-defaults');
const { parsePhotoCropFromBody } = require('../lib/photo-crop');
const { parseBoardFeaturesFromBody } = require('../lib/board-features');
const { invalidateBoardCache } = require('../lib/board-cache');
const { loadAdminSynagogue, invalidateAdminSynagogueCache } = require('../lib/admin-synagogue-load');
const {
    parseOptionalDeathDate,
    parseDeathDateFields,
    countPeopleWithoutDeathDate,
} = require('../lib/death-date');
const {
    summarizeBoardScreens,
    resolvePublishedVersion,
    formatPublishedAt,
} = require('../lib/board-publish');
const { loadChangelog, currentCodeVersion, hasUnseenRelease } = require('../lib/changelog');
const { refreshCommunityDisplayScreens } = require('../lib/refresh-display-screens');
const {
  normalizeSnapshot,
  saveViewThumbnail,
  deleteScreenshot,
  buildApplyUpdate,
  findSavedView,
  normalizeSavedViews,
  repairSavedViewsInDb,
  savedViewsNeedRepair,
  serializeSavedViews,
} = require('../lib/saved-views');
const { parseMemorialQrPanelFromBody, memorialQrPanelToUpdate } = require('../lib/memorial-qr-panel');
const {
  parseFontScalesFromBody,
  normalizeTileOpacity,
  normalizeLogoBorderRadius,
  normalizeLogoBackground,
} = require('../lib/theme-typography');
const { processCommunityLogoUpload } = require('../lib/community-logo-upload');
const {
  IMAGES_DIR,
  PHOTOS_DIR,
} = require('../lib/storage-paths');
const { optimizeUploadedImage } = require('../lib/image-optimize');
const {
  createLoginRateLimiter,
  regenerateSession,
  isAllowedImageUpload,
  isAllowedCommunityLogoUpload,
  publicErrorMessage,
} = require('../lib/http-security');
const {
  buildCommunityEventPayload,
  categorizeCommunityEvents,
  nextCommunityEventSortOrder,
  reorderCommunityEvents,
} = require('../lib/community-events');
const loginRateLimiter = createLoginRateLimiter();
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
const { parsePeopleListSearchParam, personMatchesPeopleSearch } = require('../lib/people-list-search');
const { parsePublicSubmissionFromBody, parseFormCheckbox } = require('../lib/public-submission');
const {
  buildSavedViewExport,
  normalizeImportedSnapshot,
  readImportName,
} = require('../lib/saved-view-portable');
const MemorialPersonInvite = require('../models/MemorialPersonInvite');
const { listPendingPersonAddRequests } = require('../lib/person-add-request');
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
const { resolveSynagogueTimezone } = require('../lib/yahrzeit');
const { computeHebrewDateOfDeath } = require('../lib/person-hebrew-death');
const { backfillPeopleHebrewDeathDates } = require('../lib/person-hebrew-backfill');
const { getCachedUpcomingHolidayNotice } = require('../lib/admin-holiday-notice-cache');
const { getCachedAdminYahrzeitBundle, getCachedYahrzeitTodayCount } = require('../lib/admin-yahrzeit-cache');
const { createAdminTiming } = require('../lib/admin-timing');
const {
    getWeeklyKaddishEntries, buildWeeklyKaddishMessage, buildWhatsappUrl, isWeekConfirmed,
} = require('../lib/weekly-kaddish');
const { buildFaviconPath, resolveFaviconLogoFilename } = require('../lib/favicon');
const { OFFICIAL_LOGO_FILENAME } = require('../lib/board-defaults');
const { CANDLE_PALETTE_KEYS, normalizeCandlePalette } = require('../lib/candle-palette');
const { normalizeBoardFeatures } = require('../lib/board-features');
const { BOARD_FONTS, normalizeBoardFont } = require('../lib/board-fonts');
const { scanPathForSlug, safeScanReturnPath } = require('../lib/grave-scan');

const BOARD_FEATURE_TOGGLE_META = [
  { key: 'dailyChumash', labelKey: 'feature_daily_chumash' },
  { key: 'dailyTehillim', labelKey: 'feature_daily_tehillim' },
  { key: 'dailyTanya', labelKey: 'feature_daily_tanya' },
  { key: 'dailyRambam', labelKey: 'feature_daily_rambam' },
  { key: 'hayomYom', labelKey: 'feature_hayom_yom' },
  { key: 'upcomingHolidays', labelKey: 'feature_upcoming_holidays' },
  { key: 'communityEvents', labelKey: 'feature_community_events' },
  { key: 'kelMaleRachamim', labelKey: 'feature_kel_male_rachamim' },
  { key: 'izkor', labelKey: 'feature_izkor' },
  { key: 'weather', labelKey: 'feature_weather' },
  { key: 'sunriseSunset', labelKey: 'feature_sunrise_sunset' },
  { key: 'officialLogo', labelKey: 'feature_official_logo' },
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
    keys: ['officialLogo', 'upcomingHolidays', 'communityEvents', 'weather', 'sunriseSunset'],
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

  return BOARD_FEATURE_GROUPS.map((group) => ({
    groupKey: group.groupKey,
    helpKey: group.helpKey,
    special: group.special || '',
    toggles: group.keys.map((key) => togglesByKey[key]).filter(Boolean),
    synagogueSlug: synagogue?.slug || '',
    shabbatTimesEnabled: synagogue?.shabbatTimesEnabled === true,
    publicSubmissionEnabled: synagogue?.publicSubmission?.enabled === true,
  })).filter((group) => group.toggles.length > 0 || !!group.special);
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
  })).filter((group) => group.sliders.length > 0);
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

const { MAX_UPLOAD_BYTES } = require('../lib/upload-limits');

const upload = multer({
    storage,
    limits: { fileSize: MAX_UPLOAD_BYTES },
    fileFilter: function (req, file, cb) {
        if (file.fieldname === 'logo') {
            if (!isAllowedCommunityLogoUpload(file)) {
                return cb(new Error('Only JPEG, PNG, WebP, GIF, or SVG images are allowed'));
            }
        } else if (!isAllowedImageUpload(file)) {
            return cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
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
        const synagogue = await loadAdminSynagogue(req.session.adminSlug, 'context');
        if (req.session.adminSlug && slug === req.session.adminSlug && synagogue && savedViewsNeedRepair(synagogue.savedViews)) {
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

async function fetchSlideshow(slug) {
    const doc = await loadAdminSynagogue(slug, 'settings');
    if (!doc || !doc.slideshow) {
        return null;
    }
    
    // Ensure all slides have an _id for deletion to work
    if (Array.isArray(doc.slideshow.images)) {
        doc.slideshow.images = doc.slideshow.images.map((slide, index) => {
            if (slide && !slide._id && !slide.id) {
                // Use index as fallback identifier for slides without _id
                return { ...slide, id: `slide-${index}` };
            }
            return slide;
        });
    }
    
    return doc.slideshow;
}

async function getUpcomingHolidayNotice(synagogue) {
    try {
        const { getUpcomingHolidays } = require('../lib/jewish-feed');
        const lang = (synagogue && (synagogue.adminLanguage || synagogue.language)) || 'ru';
        const timezone = resolveSynagogueTimezone(synagogue);
        return await getCachedUpcomingHolidayNotice(async () => {
            const holidays = await getUpcomingHolidays(lang, 30, 5);
            return holidays && holidays.length ? holidays[0] : null;
        }, { lang, timezone });
    } catch (err) {
        console.warn('upcoming holiday notice failed:', err.message);
        return null;
    }
}

function normalizeInternalNotes(raw) {
    return String(raw || '').trim().slice(0, 4000);
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
    res.render('admin/login', {
        layout: false,
        next: safeScanReturnPath(req.query.next),
    });
});

function redirectAfterAdminLogin(res, slug, permissions, nextUrl) {
    const scanPath = scanPathForSlug(nextUrl, slug);
    if (scanPath && permissionAllows(permissions, 'people')) {
        return res.redirect(scanPath);
    }
    if (!permissions) {
        return res.redirect(`/admin/${slug}/dashboard`);
    }
    return res.redirect(getDefaultLandingPath(slug, permissions));
}

router.post('/login', loginRateLimiter, async (req, res) => {
    const { slug: slugInput, password } = req.body;
    const { slug, username } = parseSlugAndUsername(slugInput);
    const nextUrl = req.body.next;
    try {
        const synagogue = await Synagogue.findOne({ slug }).select('+adminPassword');
        if (synagogue && await verifyPassword(password, synagogue.adminPassword)) {
            const hashed = await ensureHashed(password, synagogue.adminPassword);
            if (hashed) {
                await Synagogue.updateOne({ slug }, { $set: { adminPassword: hashed } });
            }

            await regenerateSession(req);

            if (username) {
                const adminUser = findAdminUser(synagogue, username);
                if (!adminUser) {
                    return res.render('admin/login', {
                        error: 'Unknown user for this synagogue',
                        layout: false,
                        next: scanPathForSlug(nextUrl, slug),
                    });
                }
                req.session.adminSlug = slug;
                req.session.adminUsername = normalizeAdminUsername(username);
                const permissions = resolveAdminPermissions(req.session, synagogue);
                return redirectAfterAdminLogin(res, slug, permissions, nextUrl);
            }

            req.session.adminSlug = slug;
            req.session.adminUsername = null;
            return redirectAfterAdminLogin(res, slug, FULL_ADMIN_PERMISSIONS, nextUrl);
        }
        res.render('admin/login', {
            error: 'Invalid credentials',
            layout: false,
            next: scanPathForSlug(nextUrl, slug),
        });
    } catch (err) {
        console.error('Admin login error:', err);
        res.status(500).send(publicErrorMessage(err));
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

router.use('/:slug', loadAdminContext);

function invalidateBoardOnMutation(req, res, next) {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        return next();
    }

    const slug = req.params.slug;
    if (!slug) {
        return next();
    }

    const end = res.end.bind(res);
    res.end = function endWithCacheInvalidation(...args) {
        if (res.statusCode < 400) {
            invalidateBoardCache(slug);
            invalidateAdminSynagogueCache(slug);
        }
        return end(...args);
    };

    return next();
}

router.use('/:slug', invalidateBoardOnMutation);

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

const ADMIN_PAGE_SCRIPTS = {
    'admin/dashboard': [],
    'admin/people': ['admin-people.js', 'admin-person-card.js', 'contact-platform-ui.js', 'admin-person-invites.js'],
    'admin/contacts': ['admin-contact-directory.js', 'contact-platform-ui.js'],
    'admin/events': ['admin-events.js', 'admin-slideshow.js'],
    'admin/users': ['admin-users.js'],
    'admin/yahrzeit': ['admin-yahrzeit.js', 'admin-tile-capture.js'],
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
    const yahrzeitTodayCount = getCachedYahrzeitTodayCount(displaySynagogue);
    const publishedVersion = resolvePublishedVersion(displaySynagogue && displaySynagogue.publishedVersion);
    const boardPublishSummary = summarizeBoardScreens(
        displaySynagogue && displaySynagogue.boardClients,
        publishedVersion,
    );
    const boardPublish = {
        ...boardPublishSummary,
        publishedAtLabel: formatPublishedAt(displaySynagogue && displaySynagogue.publishedAt, locale.adminLanguage),
        screens: boardPublishSummary.screens.slice(0, 12).map((screen) => ({
            ...screen,
            clientLabel: getTranslator(locale.adminLanguage)(`screen_client_${screen.client}`),
            lastSeenLabel: formatPublishedAt(screen.lastSeenAt, locale.adminLanguage),
        })),
    };

    res.render(view, {
        ...options,
        synagogue: displaySynagogue,
        adminUser,
        canManageUsers: options.canManageUsers !== undefined ? options.canManageUsers : !adminUser,
        adminPermissions: options.adminPermissions || FULL_ADMIN_PERMISSIONS,
        adminTranslate: getTranslator(locale.adminLanguage),
        adminDir: locale.adminDir,
        adminIsRtl: locale.adminIsRtl,
        yahrzeitTodayCount,
        undatedPeopleCount: countPeopleWithoutDeathDate(displaySynagogue && displaySynagogue.people),
        boardPublish,
        codeRelease: {
            version: currentCodeVersion(),
            unseen: hasUnseenRelease(displaySynagogue && displaySynagogue.lastRefreshedCodeVersion),
            changelog: loadChangelog(),
        },
        officialLogoUrl: `/images/${OFFICIAL_LOGO_FILENAME}`,
        faviconUrl: buildFaviconPath(displaySynagogue.slug, { badge: false }),
        faviconAlertUrl: buildFaviconPath(displaySynagogue.slug, { badge: true }),
        adminNavActive: options.adminNavActive || ADMIN_NAV_BY_VIEW[view] || '',
        adminPageScripts: ADMIN_PAGE_SCRIPTS[view] || [],
        impersonatedByMaster: !!(res.req && res.req.session && res.req.session.impersonatedByMaster),
        layout: options.layout === false ? false : (options.layout || 'admin'),
    });
}

function wantsJson(req) {
    return req.get('X-Requested-With') === 'XMLHttpRequest' || req.query.ajax === '1';
}

async function fetchCommunityEvents(slug) {
    const doc = await loadAdminSynagogue(slug, 'settings');
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
            language, shabbatTimesEnabled, candlePalette, logoBorderRadius, logoBackground,
        } = req.body;
        const synagogue = await loadAdminSynagogue(req.params.slug, 'settings');
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
            if ('boardFont' in req.body) {
                updateData['theme.boardFont'] = normalizeBoardFont(req.body.boardFont);
            }
            Object.entries(fontScales).forEach(([key, value]) => {
                updateData[`theme.fontScales.${key}`] = value;
            });
            Object.assign(updateData, memorialQrPanelToUpdate(
              parseMemorialQrPanelFromBody(req.body, synagogue?.memorialQrPanel),
            ));
            if ('publicSubmissionDonationUrl' in req.body) {
                updateData['publicSubmission.donationUrl'] = publicSubmission.donationUrl || '';
            }
            if ('publicSubmissionShowDonationQr' in req.body) {
                updateData['publicSubmission.showDonationQr'] = parseFormCheckbox(req.body, 'publicSubmissionShowDonationQr') === true;
            }
            if ('publicSubmissionShowRegistrationQr' in req.body) {
                updateData['publicSubmission.showRegistrationQr'] = parseFormCheckbox(req.body, 'publicSubmissionShowRegistrationQr') === true;
            }
        }

        if (permissions.settingsLanguages || permissions.settingsAppearance) {
            updateData.language = language;
        }

        if (permissions.settingsFeatures) {
            if ('shabbatTimesEnabled' in req.body) {
                updateData.shabbatTimesEnabled = parseFormCheckbox(req.body, 'shabbatTimesEnabled') === true;
            }
            Object.assign(updateData, Object.fromEntries(
                Object.entries(boardFeatures).map(([key, value]) => [`boardFeatures.${key}`, value]),
            ));
            if ('publicSubmissionEnabled' in req.body) {
                updateData['publicSubmission.enabled'] = !!publicSubmission.enabled;
            }
        }

        if (permissions.settingsBranding && req.files['logo']) {
            const logoFile = req.files['logo'][0];
            updateData['theme.logo'] = await processCommunityLogoUpload(logoFile.path, logoFile.mimetype);
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
        const synagogue = await loadAdminSynagogue(req.params.slug, 'settings');
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
        const synagogue = await loadAdminSynagogue(req.params.slug, 'settings');
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
        invalidateAdminSynagogueCache(req.params.slug);
        return res.json({ ok: true });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

router.get('/:slug/settings/saved-views/:viewId/export', requireAdmin, requirePermission('settings'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).json({ ok: false, error: 'Forbidden' });
    const permissions = req.adminPermissions || FULL_ADMIN_PERMISSIONS;
    if (!canManageSavedViews(permissions)) {
        return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

    try {
        const synagogue = await loadAdminSynagogue(req.params.slug, 'settings');
        const view = findSavedView(synagogue?.savedViews, req.params.viewId);
        if (!view) {
            return res.status(404).json({ ok: false, error: 'Not found' });
        }

        const payload = buildSavedViewExport(view);
        const safeName = String(view.name || 'saved-view').replace(/[^\w\u0590-\u05FF.-]+/g, '_').slice(0, 80);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${safeName || 'saved-view'}.json"`);
        return res.send(JSON.stringify(payload, null, 2));
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

router.post('/:slug/settings/saved-views/import', requireAdmin, requirePermission('settings'), async (req, res) => {
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

        const imported = req.body && (req.body.export || req.body);
        const name = readImportName(imported, req.body?.name);
        if (!name) {
            return res.status(400).json({ ok: false, error: 'Name is required' });
        }

        const snapshot = normalizeImportedSnapshot(imported, synagogue);
        const screenshot = await saveViewThumbnail(snapshot, '');
        const view = {
            id: require('crypto').randomUUID(),
            name,
            savedAt: new Date(),
            screenshot,
            snapshot,
        };

        const savedViews = normalizeSavedViews(synagogue.savedViews);
        savedViews.unshift(view);

        await Synagogue.updateOne(
            { slug: req.params.slug },
            { $set: { savedViews } },
            { runValidators: false },
        );
        invalidateAdminSynagogueCache(req.params.slug);

        return res.json({ ok: true, view });
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

        const usersPath = `/admin/${req.params.slug}/users`;
        const referer = req.get('Referer') || usersPath;
        if (referer.includes(usersPath)) {
            return res.redirect(`${usersPath}?saved=1`);
        }
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
        let synagogue = await loadAdminSynagogue(req.params.slug, 'settings');
        await persistTitlesIfMissing(synagogue);
        if (synagogue && synagogue.slug) {
            invalidateAdminSynagogueCache(synagogue.slug);
            synagogue = await loadAdminSynagogue(req.params.slug, 'settings');
        }
        const enriched = enrichSynagogueForAdmin(synagogue);
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
            boardFontOptions: BOARD_FONTS.map((font) => ({
              id: font.id,
              labelKey: font.labelKey,
              selected: normalizeBoardFont(enriched.theme.boardFont) === font.id,
            })),
            saved: req.query.saved === '1',
            refreshed: req.query.refreshed === '1',
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
    const person = {
        id: fallbackId,
        name: String(raw.name || '').trim(),
        text: sanitizeRichText(raw.text || ''),
        title: raw.title ? String(raw.title) : '',
        photo: raw.photo ? String(raw.photo) : '',
        gregorianDateOfDeath: parseOptionalDeathDate(raw.gregorianDateOfDeath || raw.dateOfDeath) || undefined,
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
    const hebrew = computeHebrewDateOfDeath(person.gregorianDateOfDeath);
    if (hebrew) {
        person.hebrewDateOfDeath = hebrew;
    }
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
                ...('weeklyKaddishWhatsapp' in req.body
                    ? { weeklyKaddishWhatsapp: String(req.body.weeklyKaddishWhatsapp || '').trim().slice(0, 30) }
                    : {}),
            },
        });
        return res.redirect(`/admin/${req.params.slug}/yahrzeit?saved=1`);
    } catch (err) {
        return res.status(500).send(err.message);
    }
});

router.get('/:slug/yahrzeit', requireAdmin, requirePermission('people'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    const timing = createAdminTiming(res, `GET /admin/${req.params.slug}/yahrzeit`);
    try {
        const synagogue = await loadAdminSynagogue(req.params.slug, 'yahrzeit');
        timing.mark('db');
        void backfillPeopleHebrewDeathDates(req.params.slug, synagogue && synagogue.people);
        const enriched = enrichSynagogueForAdmin(synagogue);
        const displaySynagogue = applyUserDisplaySettings(enriched, req.adminUser);
        const now = new Date();
        const bundle = getCachedAdminYahrzeitBundle(enriched, {
            now,
            adminLanguage: displaySynagogue.adminLanguage,
        });
        const { entries, weekEntries, weeklyKaddish: weeklyKaddishBase, dayKey: todayLabel } = bundle;
        timing.mark('compute');
        const entryIds = new Set(entries.map((entry) => entry.id));
        const weekIds = new Set(weekEntries.map((entry) => entry.id));
        const yahrzeitPeople = (enriched.people || []).filter((person) => (
            entryIds.has(person.id) || weekIds.has(person.id)
        ));

        const upcomingHolidayNotice = await getUpcomingHolidayNotice(enriched);
        timing.mark('holiday');
        const timezone = resolveSynagogueTimezone(enriched);
        const weeklyKaddish = weeklyKaddishBase;
        if (weeklyKaddish.entries.length) {
            const message = buildWeeklyKaddishMessage(weeklyKaddish.entries);
            const confirmation = synagogue.weeklyKaddishConfirmation || {};
            weeklyKaddish.message = message;
            weeklyKaddish.whatsappUrl = buildWhatsappUrl(synagogue.weeklyKaddishWhatsapp, message);
            weeklyKaddish.confirmed = isWeekConfirmed(synagogue, weeklyKaddish.weekKey);
            weeklyKaddish.confirmedBy = weeklyKaddish.confirmed ? confirmation.confirmedBy : '';
            weeklyKaddish.confirmedAtLabel = weeklyKaddish.confirmed
                ? new Date(confirmation.confirmedAt).toLocaleString('he-IL', { timeZone: timezone })
                : '';
        }

        renderAdmin(res, 'admin/yahrzeit', {
            weeklyKaddish: weeklyKaddish.entries.length ? weeklyKaddish : null,
            weeklyKaddishWhatsapp: synagogue.weeklyKaddishWhatsapp || '',
            synagogue: enriched,
            adminUser: req.adminUser,
            adminPermissions: req.adminPermissions,
            entries,
            weekEntries,
            yahrzeitPeople,
            todayLabel,
            upcomingHolidayNotice,
            saved: req.query.saved === '1',
        });
        timing.mark('render');
        timing.finish();
    } catch (err) {
        timing.finish();
        res.status(500).send(err.message);
    }
});

router.post('/:slug/yahrzeit/weekly-confirm', requireAdmin, requirePermission('people'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const synagogue = await loadAdminSynagogue(req.params.slug, 'settings');
        if (!synagogue) return res.status(404).send('Not found');
        const { weekKey } = getWeeklyKaddishEntries(synagogue, new Date());
        const confirmedBy = (req.adminUser && (req.adminUser.displayName || req.adminUser.username))
            || req.session.adminUsername || 'admin';
        await Synagogue.updateOne({ slug: req.params.slug }, {
            $set: { weeklyKaddishConfirmation: { weekKey, confirmedBy, confirmedAt: new Date() } },
        });
        return res.redirect(`/admin/${req.params.slug}/yahrzeit#weekly-kaddish`);
    } catch (err) {
        return res.status(500).send(err.message);
    }
});

// Yahrzeit tile image for sharing
router.get('/:slug/yahrzeit/tile/:personId.png', requireAdmin, requirePermission('people'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const synagogue = await loadAdminSynagogue(req.params.slug, 'people');
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
            photoCrop: person.photoCrop,
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
        const synagogue = await loadAdminSynagogue(req.params.slug, 'people');
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

router.get('/:slug/people/list', requireAdmin, requirePermission('people'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).json({ ok: false, error: 'Forbidden' });
    try {
        const synagogue = await loadAdminSynagogue(req.params.slug, 'people');
        if (!synagogue) {
            return res.status(404).json({ ok: false, error: 'Not found' });
        }

        const query = parsePeopleListSearchParam(req.query.q).toLowerCase();
        void backfillPeopleHebrewDeathDates(req.params.slug, synagogue.people);
        let people = synagogue.people || [];
        if (query) {
            people = people.filter((person) => personMatchesPeopleSearch(person.name, query));
        }

        return res.json({
            ok: true,
            people,
            total: (synagogue.people || []).length,
            undatedCount: countPeopleWithoutDeathDate(synagogue.people),
        });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

function buildMemorialPersonInviteUrl(req, slug, token) {
    const host = req.get('host');
    return `${req.protocol}://${host}/s/${encodeURIComponent(slug)}/add-name/invite/${encodeURIComponent(token)}`;
}

async function loadMemorialPersonInvitesForAdmin(req, slug) {
    const invites = await MemorialPersonInvite.find({ synagogueSlug: slug })
        .sort({ createdAt: -1 })
        .limit(40)
        .lean();

    return invites.map((invite) => {
        const doc = new MemorialPersonInvite(invite);
        return {
            id: String(invite._id),
            label: invite.label || '',
            createdAt: invite.createdAt,
            expiresAt: invite.expiresAt,
            revoked: !!invite.revoked,
            active: doc.isUsable(),
            inviteUrl: buildMemorialPersonInviteUrl(req, slug, invite.token),
        };
    });
}

router.get('/:slug/people', requireAdmin, requirePermission('people'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const synagogue = await loadAdminSynagogue(req.params.slug, 'people');
        const enriched = enrichSynagogueForAdmin(synagogue);
        enriched.contactDirectoryCount = normalizeContactDirectory(enriched.contactDirectory).length;
        const pendingPersonAddRequests = listPendingPersonAddRequests(enriched.personAddRequests);
        const personInvites = await loadMemorialPersonInvitesForAdmin(req, req.params.slug);
        renderAdmin(res, 'admin/people', {
            synagogue: enriched,
            adminUser: req.adminUser,
            adminPermissions: req.adminPermissions,
            imported: req.query.imported === '1',
            importError: req.query.importError === '1',
            dateError: req.query.dateError === '1',
            undatedOnly: req.query.undated === '1',
            peopleSearchQuery: parsePeopleListSearchParam(req.query.q),
            pendingPersonAddRequests,
            personInvites,
            inviteCreated: req.query.inviteCreated === '1',
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/:slug/person-add-requests/:requestId/dismiss', requireAdmin, requirePermission('people'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const result = await Synagogue.updateOne(
            {
                slug: req.params.slug,
                'personAddRequests.id': req.params.requestId,
            },
            { $set: { 'personAddRequests.$.status': 'dismissed' } },
        );
        if (!result.matchedCount) {
            return res.status(404).send('Not found');
        }
        invalidateAdminSynagogueCache(req.params.slug);
        return res.redirect(`/admin/${req.params.slug}/people`);
    } catch (err) {
        return res.status(500).send(err.message);
    }
});

router.post('/:slug/person-invites', requireAdmin, requirePermission('people'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const synagogue = await Synagogue.findOne({ slug: req.params.slug }).select('slug').lean();
        if (!synagogue) {
            return res.status(404).send('Not found');
        }

        const label = String(req.body.label || '').trim().slice(0, 120);
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const token = MemorialPersonInvite.generateToken();
        await new MemorialPersonInvite({
            synagogueSlug: req.params.slug,
            token,
            label,
            expiresAt,
        }).save();

        return res.redirect(`/admin/${req.params.slug}/people?inviteCreated=1#person-invites`);
    } catch (err) {
        return res.status(500).send(err.message);
    }
});

router.post('/:slug/person-invites/:inviteId/revoke', requireAdmin, requirePermission('people'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const result = await MemorialPersonInvite.updateOne(
            { _id: req.params.inviteId, synagogueSlug: req.params.slug },
            { $set: { revoked: true } },
        );
        if (!result.matchedCount) {
            return res.status(404).send('Not found');
        }
        return res.redirect(`/admin/${req.params.slug}/people#person-invites`);
    } catch (err) {
        return res.status(500).send(err.message);
    }
});

router.get('/:slug/contact-directory', requireAdmin, requirePermission('contactDirectory'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const synagogue = await loadAdminSynagogue(req.params.slug, 'settings');
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
        const synagogue = await loadAdminSynagogue(req.params.slug, 'settings');
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
        const synagogue = await loadAdminSynagogue(req.params.slug, 'settings');
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
        const synagogue = await Synagogue.findOne({ slug: req.params.slug })
            .select('contactDirectory')
            .lean();
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
        invalidateAdminSynagogueCache(req.params.slug);

        return res.json({ ok: true, contact: added, total: after.length });
    } catch (err) {
        return res.status(400).json({ ok: false, error: err.message });
    }
});

router.put('/:slug/contacts/:contactId', requireAdmin, requirePermission('contactDirectory'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).json({ ok: false, error: 'Forbidden' });
    try {
        const synagogue = await Synagogue.findOne({ slug: req.params.slug })
            .select('contactDirectory')
            .lean();
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
        invalidateAdminSynagogueCache(req.params.slug);

        return res.json({ ok: true, contact, total: contactDirectory.length });
    } catch (err) {
        const status = /not found/i.test(err.message) ? 404 : 400;
        return res.status(status).json({ ok: false, error: err.message });
    }
});

router.delete('/:slug/contacts/:contactId', requireAdmin, requirePermission('contactDirectory'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).json({ ok: false, error: 'Forbidden' });
    try {
        const synagogue = await Synagogue.findOne({ slug: req.params.slug })
            .select('contactDirectory')
            .lean();
        if (!synagogue) {
            return res.status(404).json({ ok: false, error: 'Not found' });
        }

        const contactDirectory = removeDirectoryEntry(synagogue.contactDirectory, req.params.contactId);
        await Synagogue.updateOne(
            { slug: req.params.slug },
            { $set: { contactDirectory } },
            { runValidators: false },
        );
        invalidateAdminSynagogueCache(req.params.slug);

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
        const synagogue = await Synagogue.findOne({ slug: req.params.slug })
            .select('contactDirectory')
            .lean();
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
        invalidateAdminSynagogueCache(req.params.slug);

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

function readDeathDateOrRespond(req, res) {
    try {
        return parseDeathDateFields(req.body.month, req.body.date, req.body.year);
    } catch (err) {
        if (err && err.code === 'incomplete_death_date') {
            if (wantsJson(req)) {
                res.status(400).json({ ok: false, error: 'incomplete_death_date' });
            } else {
                res.redirect(`/admin/${req.params.slug}/people?dateError=1`);
            }
            return undefined;
        }
        throw err;
    }
}

async function handleAdminRefreshScreens(req, res) {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const result = await refreshCommunityDisplayScreens(req.params.slug);
        if (!result) {
            return res.status(404).send('Not found');
        }

        if (wantsJson(req)) {
            return res.json({ ok: true, publishedVersion: result.publishedVersion });
        }

        return res.redirect(`/admin/${req.params.slug}/dashboard?refreshed=1`);
    } catch (err) {
        return res.status(500).send(err.message);
    }
}

router.post('/:slug/refresh-screens', requireAdmin, requirePermission('settings'), handleAdminRefreshScreens);
router.post('/:slug/publish-version', requireAdmin, requirePermission('settings'), handleAdminRefreshScreens);

router.post('/:slug/end-master-impersonation', requireAdmin, async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    if (!req.session.impersonatedByMaster || !req.session.isMasterAdmin) {
        return res.status(403).send('Forbidden');
    }
    try {
        const slug = req.session.adminSlug;
        await regenerateSession(req);
        req.session.isMasterAdmin = true;
        req.session.impersonatedByMaster = false;
        console.info(`[master-impersonation-end] ${new Date().toISOString()} slug=${slug}`);
        return res.redirect('/master/communities');
    } catch (err) {
        return res.status(500).send(err.message);
    }
});

router.post('/:slug/people/add', requireAdmin, requirePermission('people'), upload.single('photo'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { name, text } = req.body;
        const deathDate = readDeathDateOrRespond(req, res);
        if (deathDate === undefined && res.headersSent) {
            return undefined;
        }
        const contacts = parsePersonContactsFromBody(req.body);
        const legacy = personContactsToLegacyFields(contacts);
        const synagogue = await Synagogue.findOne({ slug: req.params.slug });
        const maxId = synagogue.people.reduce((max, p) => p.id > max ? p.id : max, 0);

        const newPerson = {
            id: maxId + 1,
            name,
            text: sanitizeRichText(text),
            internalNotes: normalizeInternalNotes(req.body.internalNotes),
            photo: req.file ? await optimizeUploadedImage(req.file.path, 'photo') : '',
            photoCrop: req.file ? parsePhotoCropFromBody(req.body) : undefined,
            title: '',
            contact: legacy.contact,
            contacts: legacy.contacts,
        };
        if (deathDate) {
            newPerson.gregorianDateOfDeath = deathDate;
            const hebrew = computeHebrewDateOfDeath(deathDate);
            if (hebrew) {
                newPerson.hebrewDateOfDeath = hebrew;
            }
        }

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
        const { id, name, text, deletePhoto } = req.body;
        const deathDate = readDeathDateOrRespond(req, res);
        if (deathDate === undefined && res.headersSent) {
            return undefined;
        }
        const contacts = parsePersonContactsFromBody(req.body);
        const legacy = personContactsToLegacyFields(contacts);
        const personId = parseInt(id);

        const updateFields = {
            'people.$.name': name,
            'people.$.text': sanitizeRichText(text),
            'people.$.internalNotes': normalizeInternalNotes(req.body.internalNotes),
            'people.$.contact': legacy.contact,
            'people.$.contacts': legacy.contacts,
        };
        const update = { $set: updateFields };
        if (deathDate) {
            updateFields['people.$.gregorianDateOfDeath'] = deathDate;
            const hebrew = computeHebrewDateOfDeath(deathDate);
            if (hebrew) {
                updateFields['people.$.hebrewDateOfDeath'] = hebrew;
            }
        } else {
            update.$unset = { 'people.$.gregorianDateOfDeath': '', 'people.$.hebrewDateOfDeath': '' };
        }

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
            update
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


// Slideshow management (embedded under Events tab)
router.post('/:slug/slideshow/settings', requireAdmin, requireAnyPermission('events', 'slideshow'), parseFormBody, async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { enabled, interval, mainDuration } = req.body || {};
        // Unchecked checkbox is omitted from both multipart and urlencoded bodies → false
        const isEnabled = enabled === 'on' || enabled === 'true' || enabled === true || enabled === '1';
        await Synagogue.updateOne({ slug: req.params.slug }, {
            $set: {
                'slideshow.enabled': isEnabled,
                'slideshow.interval': parseInt(interval, 10) || 10,
                'slideshow.mainDuration': parseInt(mainDuration, 10) || 30
            }
        });
        invalidateBoardCache(req.params.slug);
        invalidateAdminSynagogueCache(req.params.slug);
        return res.json({ ok: true, slideshow: await fetchSlideshow(req.params.slug) });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

router.post('/:slug/slideshow/add', requireAdmin, requireAnyPermission('events', 'slideshow'), upload.single('image'), async (req, res) => {
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
        invalidateBoardCache(req.params.slug);
        invalidateAdminSynagogueCache(req.params.slug);
        return res.json({ ok: true, slideshow: await fetchSlideshow(req.params.slug) });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

router.post('/:slug/slideshow/edit', requireAdmin, requireAnyPermission('events', 'slideshow'), upload.single('image'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { slideId, text } = req.body;
        const updateFields = {
            'slideshow.images.$.text': sanitizeRichText(text || ''),
        };

        if (req.file) {
            updateFields['slideshow.images.$.url'] = await optimizeUploadedImage(req.file.path, 'slideshow');
        }

        const slideIdStr = String(slideId || '').trim();
        const synagogue = await Synagogue.findOne({ slug: req.params.slug });
        if (!synagogue) {
            return res.status(404).json({ ok: false, error: 'Synagogue not found' });
        }
        const slide = ((synagogue.slideshow && synagogue.slideshow.images) || [])
            .find((entry) => {
                if (!entry) return false;
                const candidates = [entry._id, entry.id].filter((value) => value != null && value !== '');
                return candidates.some((value) => String(value) === slideIdStr);
            });
        if (!slide) {
            return res.status(404).json({ ok: false, error: 'Slide not found' });
        }
        slide.text = updateFields['slideshow.images.$.text'];
        if (updateFields['slideshow.images.$.url']) {
            slide.url = updateFields['slideshow.images.$.url'];
        }
        synagogue.markModified('slideshow.images');
        await synagogue.save();
        invalidateBoardCache(req.params.slug);
        invalidateAdminSynagogueCache(req.params.slug);
        return res.json({ ok: true, slideshow: await fetchSlideshow(req.params.slug) });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

router.post('/:slug/slideshow/delete', requireAdmin, requireAnyPermission('events', 'slideshow'), parseFormBody, async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { slideId } = req.body || {};
        const slideIdStr = String(slideId || '').trim();
        if (!slideIdStr) {
            return res.status(400).json({ ok: false, error: 'slideId is required' });
        }

        const synagogue = await Synagogue.findOne({ slug: req.params.slug });
        if (!synagogue) {
            return res.status(404).json({ ok: false, error: 'Synagogue not found' });
        }

        const images = (synagogue.slideshow && synagogue.slideshow.images) || [];
        
        // Handle index-based deletion for legacy slides (slide-0, slide-1, etc.)
        if (slideIdStr.startsWith('slide-')) {
            const index = parseInt(slideIdStr.substring(6), 10);
            if (Number.isFinite(index) && index >= 0 && index < images.length) {
                images.splice(index, 1);
                synagogue.slideshow.images = images;
                synagogue.markModified('slideshow.images');
                await synagogue.save();
                invalidateBoardCache(req.params.slug);
                invalidateAdminSynagogueCache(req.params.slug);
                return res.json({ ok: true, slideshow: await fetchSlideshow(req.params.slug) });
            }
        }
        
        // Handle ID-based deletion for slides with _id
        const nextImages = images.filter((slide) => {
            if (!slide) return true;
            const candidates = [slide._id, slide.id].filter((value) => value != null && value !== '');
            return !candidates.some((value) => String(value) === slideIdStr);
        });
        if (nextImages.length === images.length) {
            return res.status(404).json({ ok: false, error: 'Slide not found' });
        }

        synagogue.slideshow.images = nextImages;
        synagogue.markModified('slideshow.images');
        await synagogue.save();
        invalidateBoardCache(req.params.slug);
        invalidateAdminSynagogueCache(req.params.slug);
        return res.json({ ok: true, slideshow: await fetchSlideshow(req.params.slug) });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

// Free auto-translate proxy for announcements (no paid API key)
router.post('/:slug/translate', requireAdmin, requireAnyPermission('events', 'slideshow'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const text = String((req.body && req.body.text) || '').trim();
        const target = String((req.body && req.body.target) || '').trim().toLowerCase();
        const source = String((req.body && req.body.source) || 'auto').trim().toLowerCase() || 'auto';
        const allowed = new Set(['ru', 'en', 'he', 'auto']);
        if (!text) {
            return res.status(400).json({ ok: false, error: 'text is required' });
        }
        if (!allowed.has(target) || target === 'auto') {
            return res.status(400).json({ ok: false, error: 'target must be ru, en, or he' });
        }
        if (!allowed.has(source)) {
            return res.status(400).json({ ok: false, error: 'invalid source language' });
        }

        const url = 'https://translate.googleapis.com/translate_a/single'
            + `?client=gtx&sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url, {
            headers: { Accept: 'application/json' },
        });
        if (!response.ok) {
            return res.status(502).json({ ok: false, error: 'Translate service unavailable' });
        }
        const payload = await response.json();
        const translated = Array.isArray(payload) && Array.isArray(payload[0])
            ? payload[0].map((part) => (Array.isArray(part) ? String(part[0] || '') : '')).join('')
            : '';
        if (!translated) {
            return res.status(502).json({ ok: false, error: 'Empty translation response' });
        }
        return res.json({ ok: true, translated, target, source });
    } catch (err) {
        return res.status(502).json({ ok: false, error: err.message || 'Translate failed' });
    }
});

// Community events (special days & announcements)
router.get('/:slug/events', requireAdmin, requirePermission('events'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const synagogue = await loadAdminSynagogue(req.params.slug, 'settings');
        const events = synagogue.communityEvents || [];
        const categorized = categorizeCommunityEvents(events);
        const upcomingHolidayNotice = await getUpcomingHolidayNotice(synagogue);
        renderAdmin(res, 'admin/events', {
            synagogue: enrichSynagogueForAdmin(synagogue),
            adminUser: req.adminUser,
            adminPermissions: req.adminPermissions,
            events: categorized,
        upcomingHolidayNotice,
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/:slug/events/add', requireAdmin, requirePermission('events'), parseFormBody, async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const publishNow = req.body.publishNow === '1' || req.body.publishNow === 'true';
        const existingEvents = await fetchCommunityEvents(req.params.slug);
        const payload = buildCommunityEventPayload(req.body, { publishNow });
        payload.text = sanitizeRichText(payload.text);
        payload.sortOrder = nextCommunityEventSortOrder(existingEvents);

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

router.post('/:slug/events/reorder', requireAdmin, requirePermission('events'), parseFormBody, async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { eventId, direction } = req.body;
        if (!eventId || (direction !== 'up' && direction !== 'down')) {
            return res.status(400).json({ ok: false, error: 'Invalid reorder request' });
        }

        const events = await fetchCommunityEvents(req.params.slug);
        const { active } = categorizeCommunityEvents(events);
        const reorderedActive = reorderCommunityEvents(active, eventId, direction);

        const updates = reorderedActive.map((event, index) => Synagogue.updateOne(
            { slug: req.params.slug, 'communityEvents._id': event._id },
            { $set: { 'communityEvents.$.sortOrder': index } },
        ));
        await Promise.all(updates);

        const nextEvents = await fetchCommunityEvents(req.params.slug);
        return res.json({ ok: true, events: categorizeCommunityEvents(nextEvents) });
    } catch (err) {
        return res.status(400).json({ ok: false, error: err.message });
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

router.get('/:slug/users', requireAdmin, async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const synagogue = await loadAdminSynagogue(req.params.slug, 'settings');
        const translator = getTranslator(synagogue.adminLanguage || 'ru');
        const currentUserId = req.adminUser ? String(req.adminUser._id) : '';
        const allUsers = serializeAdminUsers(synagogue.adminUsers);
        const currentSessionUser = currentUserId
            ? allUsers.find((user) => user.id === currentUserId) || null
            : null;
        const enriched = enrichSynagogueForAdmin(synagogue);
        const sessionAdminProfile = currentSessionUser
            ? {
                displayName: currentSessionUser.displayName,
                username: currentSessionUser.username,
                adminLanguage: currentSessionUser.adminLanguage,
                adminColorMode: currentSessionUser.adminColorMode,
            }
            : {
                displayName: synagogue.name || synagogue.slug,
                username: synagogue.slug,
                adminLanguage: normalizeAdminLang(synagogue.adminLanguage),
                adminColorMode: resolveAdminColorMode(enriched),
            };
        renderAdmin(res, 'admin/users', {
            synagogue: enriched,
            adminUser: req.adminUser,
            adminPermissions: req.adminPermissions,
            adminUsers: allUsers.filter((user) => user.id !== currentUserId),
            currentSessionUser,
            sessionAdminProfile,
            canManageUsers: !req.session.adminUsername,
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

        const synagogue = await loadAdminSynagogue(req.params.slug, 'settings');
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

        const synagogue = await loadAdminSynagogue(req.params.slug, 'settings');
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
