(function () {
  var select = document.getElementById('onboardingLangSelect');
  if (!select) {
    return;
  }

  var cookiePath = '/join';
  var cookieMaxAge = 31536000;

  function persistLangCookie(lang) {
    document.cookie = 'onboarding_lang=' + encodeURIComponent(lang)
      + '; path=' + cookiePath
      + '; max-age=' + cookieMaxAge
      + '; samesite=lax';
  }

  select.addEventListener('change', function () {
    var lang = select.value;
    if (!lang) {
      return;
    }
    persistLangCookie(lang);
    var url = new URL(window.location.href);
    url.searchParams.set('lang', lang);
    window.location.assign(url.toString());
  });
})();
