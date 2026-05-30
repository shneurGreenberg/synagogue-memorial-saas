(function () {
  function normalizeLang(lang) {
    var code = String(lang || 'ru').trim().toLowerCase();
    return code === 'he' || code === 'en' || code === 'ru' ? code : 'ru';
  }

  function isRtl(lang) {
    return normalizeLang(lang) === 'he';
  }

  function applyAdminLocale(lang) {
    var rtl = isRtl(lang);
    var safe = normalizeLang(lang);
    document.documentElement.lang = safe;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.body.classList.toggle('admin-rtl', rtl);
  }

  window.AdminLocale = {
    normalizeLang: normalizeLang,
    isRtl: isRtl,
    apply: applyAdminLocale,
  };

  var select = document.getElementById('adminLanguage');
  if (select) {
    applyAdminLocale(select.value);
    select.addEventListener('change', function () {
      applyAdminLocale(select.value);
    });
  }
})();
