(function () {
  var pillsRoot = document.getElementById('onboardingLangPills');
  if (!pillsRoot) {
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

  function setActivePill(lang) {
    var pills = pillsRoot.querySelectorAll('.onboarding-lang-pill');
    Array.prototype.forEach.call(pills, function (pill) {
      var isActive = pill.getAttribute('data-lang') === lang;
      pill.classList.toggle('is-active', isActive);
      pill.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  pillsRoot.addEventListener('click', function (event) {
    var pill = event.target.closest('.onboarding-lang-pill');
    if (!pill || !pillsRoot.contains(pill)) {
      return;
    }

    var lang = pill.getAttribute('data-lang');
    if (!lang || pill.classList.contains('is-active')) {
      return;
    }

    persistLangCookie(lang);
    setActivePill(lang);

    var url = new URL(window.location.href);
    url.searchParams.set('lang', lang);
    window.location.assign(url.toString());
  });
})();
