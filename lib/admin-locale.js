const RTL_LANGS = new Set(['he', 'ar']);

function normalizeAdminLang(lang) {
  const code = String(lang || 'ru').trim().toLowerCase();
  return ['ru', 'en', 'he'].includes(code) ? code : 'ru';
}

function isRtlLang(lang) {
  return RTL_LANGS.has(normalizeAdminLang(lang));
}

function getAdminDir(lang) {
  return isRtlLang(lang) ? 'rtl' : 'ltr';
}

function getAdminLocaleContext(lang) {
  const adminLanguage = normalizeAdminLang(lang);
  return {
    adminLanguage,
    adminDir: getAdminDir(adminLanguage),
    adminIsRtl: isRtlLang(adminLanguage),
  };
}

module.exports = {
  normalizeAdminLang,
  isRtlLang,
  getAdminDir,
  getAdminLocaleContext,
};
