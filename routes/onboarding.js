const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');
const OnboardingInvite = require('../models/OnboardingInvite');
const CommunityOnboardingRequest = require('../models/CommunityOnboardingRequest');
const Synagogue = require('../models/Synagogue');
const { normalizeSlug, isValidSlug } = require('../lib/normalize-slug');
const { resolveTimezone } = require('../lib/normalize-timezone');
const { normalizeAdminLang } = require('../lib/admin-locale');
const { hashPassword } = require('../lib/password');
const { processCommunityLogoUpload } = require('../lib/community-logo-upload');
const { PENDING_LOGO_DIR } = require('../lib/onboarding-approve');
const { normalizeLogoBackground } = require('../lib/theme-typography');
const {
  createApiRateLimiter,
  isAllowedCommunityLogoUpload,
} = require('../lib/http-security');
const {
  resolveOnboardingLang,
  readOnboardingLangCookie,
  buildOnboardingLangCookie,
  getOnboardingTranslator,
} = require('../lib/onboarding-i18n');
const { OFFICIAL_LOGO_FILENAME } = require('../lib/board-defaults');

const router = express.Router();
const placesRateLimiter = createApiRateLimiter();

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const NOMINATIM_HEADERS = {
  'User-Agent': 'SynagogueMemorialSaaS/1.0 (community-onboarding)',
  Accept: 'application/json',
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

ensureDir(PENDING_LOGO_DIR);

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      ensureDir(PENDING_LOGO_DIR);
      cb(null, PENDING_LOGO_DIR);
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname || '') || '.bin';
      cb(null, `logo-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    if (!isAllowedCommunityLogoUpload(file)) {
      return cb(new Error('image_only'));
    }
    cb(null, true);
  },
});

async function loadInvite(token) {
  const invite = await OnboardingInvite.findOne({ token: String(token || '').trim() });
  if (!invite || !invite.isUsable()) {
    return null;
  }
  return invite;
}

function resolveRequestOnboardingLang(req, overrideLang) {
  return resolveOnboardingLang(
    overrideLang != null ? overrideLang : req.query.lang,
    readOnboardingLangCookie(req),
  );
}

function renderOnboarding(req, res, view, options = {}) {
  const lang = resolveRequestOnboardingLang(req, options.lang);
  const t = getOnboardingTranslator(lang);
  res.append('Set-Cookie', buildOnboardingLangCookie(lang));
  res.render(view, {
    layout: 'onboarding',
    lang,
    onboardingT: t,
    officialLogoUrl: `/images/${OFFICIAL_LOGO_FILENAME}`,
    ...options,
  });
}

async function nominatimFetch(urlPath) {
  const response = await fetch(`${NOMINATIM}${urlPath}`, { headers: NOMINATIM_HEADERS });
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

router.get('/api/places', placesRateLimiter, async (req, res) => {
  try {
    const token = String(req.query.token || '').trim();
    const invite = await loadInvite(token);
    if (!invite) {
      return res.status(403).json({ error: 'invalid_token' });
    }

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

router.get('/:token', async (req, res) => {
  const invite = await loadInvite(req.params.token);
  if (!invite) {
    return renderOnboarding(req, res, 'onboarding/invalid', { lang: req.query.lang });
  }

  const lang = resolveRequestOnboardingLang(req);
  const t = getOnboardingTranslator(lang);
  return renderOnboarding(req, res, 'onboarding/wizard', {
    token: invite.token,
    inviteLabel: invite.label,
    showOnboardingMap: true,
    showOnboardingWizard: true,
    error: req.query.error || null,
    onboardingConfigJson: JSON.stringify({
      token: invite.token,
      lang,
      stepLabels: {
        basics: t('step_basics'),
        location: t('step_location'),
        logo: t('step_logo'),
        contact: t('step_contact'),
        review: t('step_review'),
      },
      reviewLabels: {
        name: t('name_label'),
        slug: t('slug_label'),
        titleHe: t('title_he_label'),
        city: t('city_label'),
        contactName: t('contact_name'),
        adminEmail: t('admin_email'),
        logo: t('logo_label'),
        logoBackground: t('logo_bg_label'),
      },
    }),
  });
});

router.get('/:token/success', async (req, res) => {
  const invite = await loadInvite(req.params.token);
  if (!invite) {
    return renderOnboarding(req, res, 'onboarding/invalid', { lang: req.query.lang });
  }
  return renderOnboarding(req, res, 'onboarding/success', { token: invite.token });
});

router.post('/:token', (req, res) => {
  upload.single('logo')(req, res, async (uploadErr) => {
    const lang = resolveRequestOnboardingLang(req, req.body.lang);
    const redirectBase = `/join/${encodeURIComponent(req.params.token)}`;

    if (uploadErr) {
      const code = uploadErr.message === 'image_only' ? 'upload' : 'upload';
      return res.redirect(`${redirectBase}?lang=${lang}&error=${code}`);
    }

    try {
      const invite = await loadInvite(req.params.token);
      if (!invite) {
        return renderOnboarding(req, res, 'onboarding/invalid', { lang });
      }

      const name = String(req.body.name || '').trim();
      const slug = normalizeSlug(req.body.slug);
      const adminPassword = String(req.body.adminPassword || '');
      const adminEmail = String(req.body.adminEmail || '').trim();
      const contactName = String(req.body.contactName || '').trim();
      const contactPhone = String(req.body.contactPhone || '').trim();

      if (!name || !slug || !adminPassword || !adminEmail || !contactName) {
        return res.redirect(`${redirectBase}?lang=${lang}&error=missing`);
      }

      if (!isValidSlug(slug)) {
        return res.redirect(`${redirectBase}?lang=${lang}&error=slug`);
      }

      const slugTaken = await Synagogue.findOne({ slug });
      const pendingSlug = await CommunityOnboardingRequest.findOne({ slug, status: 'pending' });
      if (slugTaken || pendingSlug) {
        return res.redirect(`${redirectBase}?lang=${lang}&error=slug`);
      }

      const lat = parseFloat(req.body.lat);
      const long = parseFloat(req.body.long);
      const city = String(req.body.city || '').trim();
      const timezone = resolveTimezone(req.body.timezone, lat, long);

      let logoFilename = '';
      if (req.file) {
        try {
          logoFilename = await processCommunityLogoUpload(req.file.path, req.file.mimetype);
        } catch (err) {
          if (err.message === 'invalid_svg') {
            return res.redirect(`${redirectBase}?lang=${lang}&error=invalid_svg`);
          }
          throw err;
        }
      }

      const request = new CommunityOnboardingRequest({
        inviteToken: invite.token,
        name,
        slug,
        titles: {
          en: String(req.body.titleEn || name).trim(),
          he: String(req.body.titleHe || '').trim(),
          ru: String(req.body.titleRu || '').trim(),
        },
        location: {
          lat: Number.isFinite(lat) ? lat : 54.9833,
          long: Number.isFinite(long) ? long : 82.8964,
          city: city || 'Community',
          timezone,
        },
        contactName,
        contactPhone,
        adminEmail,
        boardLanguage: normalizeAdminLang(req.body.boardLanguage || 'en'),
        adminLanguage: normalizeAdminLang(req.body.adminLanguage || req.body.boardLanguage || 'en'),
        logoFilename,
        logoBackground: normalizeLogoBackground(req.body.logoBackground),
        adminPasswordHash: await hashPassword(adminPassword),
        notes: String(req.body.notes || '').trim(),
      });

      await request.save();
      return res.redirect(`/join/${encodeURIComponent(invite.token)}/success?lang=${lang}`);
    } catch (err) {
      console.error('Onboarding submit error:', err);
      return res.redirect(`${redirectBase}?lang=${lang}&error=missing`);
    }
  });
});

module.exports = router;
