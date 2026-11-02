// 1.33.0 audit #12: clear toast whenever a save (POST/PUT/PATCH/DELETE) fails.
(function () {
  if (!window.fetch || window.__adminSaveToast) return;
  window.__adminSaveToast = true;
  var lang = (document.documentElement.getAttribute('lang') || '').slice(0, 2);
  var MSG = { he: 'השמירה נכשלה. בדקו את החיבור ונסו שוב.', ru: 'Не удалось сохранить. Проверьте связь и попробуйте снова.' };
  var msg = MSG[lang] || 'Save failed. Check your connection and try again.';
  var timer;
  function show(text) {
    var el = document.getElementById('adminSaveToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'adminSaveToast';
      el.className = 'admin-save-toast';
      el.setAttribute('role', 'alert');
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(function () { el.hidden = true; }, 6000);
  }
  window.adminShowSaveError = show;
  var orig = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    var mutating = method !== 'GET' && method !== 'HEAD';
    var p = orig(input, init);
    if (!mutating) return p;
    return p.then(function (res) {
      if (!res.ok && res.status !== 401) show(msg);
      return res;
    }, function (err) {
      show(msg);
      throw err;
    });
  };
})();
