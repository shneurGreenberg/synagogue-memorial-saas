const { getTranslator } = require('./admin-translations');
const { normalizeAdminLang } = require('./admin-locale');
const { loadAdminSynagogue } = require('./admin-synagogue-load');
const { resolveCommunityDisplayName } = require('./community-display-name');
const { loginUrlForSlug } = require('./admin-session-slug');

function wantsJson(req) {
  return req.get('X-Requested-With') === 'XMLHttpRequest' || req.query.ajax === '1';
}

async function resolveWrongCommunityLang(req) {
  const sessionSlug = req.session && req.session.adminSlug;
  if (!sessionSlug) {
    return 'he';
  }
  try {
    const synagogue = await loadAdminSynagogue(sessionSlug, 'context');
    if (!synagogue) {
      return 'he';
    }
    if (req.session.adminUsername) {
      const users = synagogue.adminUsers || [];
      const user = users.find((entry) => String(entry.username || '').toLowerCase()
        === String(req.session.adminUsername || '').toLowerCase());
      if (user && user.adminLanguage) {
        return normalizeAdminLang(user.adminLanguage);
      }
    }
    return normalizeAdminLang(synagogue.adminLanguage || synagogue.language || 'he');
  } catch {
    return 'he';
  }
}

async function renderAdminWrongCommunity(req, res) {
  const targetSlug = String(req.params.slug || '').trim();
  const sessionSlug = String(req.session.adminSlug || '').trim();
  const lang = await resolveWrongCommunityLang(req);
  const t = getTranslator(lang);
  const loginUrl = loginUrlForSlug(targetSlug);
  const logoutUrl = `/admin/logout?next=${encodeURIComponent(loginUrl)}`;

  if (wantsJson(req)) {
    return res.status(403).json({
      ok: false,
      error: 'wrong_community',
      loginUrl,
      logoutUrl,
    });
  }

  let targetCommunityName = targetSlug;
  try {
    const target = await loadAdminSynagogue(targetSlug, 'context');
    if (target) {
      targetCommunityName = resolveCommunityDisplayName(target, lang) || targetSlug;
    }
  } catch {
    /* use slug fallback */
  }

  return res.status(403).render('admin/wrong-community', {
    layout: false,
    lang,
    dir: lang === 'he' ? 'rtl' : 'ltr',
    targetSlug,
    targetCommunityName,
    sessionSlug,
    loginUrl,
    logoutUrl,
    title: t('admin_wrong_community_title'),
    message: t('admin_wrong_community_message'),
    loginButton: t('admin_wrong_community_login'),
    logoutButton: t('admin_wrong_community_logout_first'),
    backToMyCommunity: t('admin_wrong_community_back'),
    myCommunityUrl: sessionSlug ? `/admin/${encodeURIComponent(sessionSlug)}/dashboard` : '/admin/login',
    t,
  });
}

module.exports = {
  renderAdminWrongCommunity,
  wantsJson,
};
