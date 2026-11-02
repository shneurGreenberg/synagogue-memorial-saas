/* 1.31.3: Hebrew / Gregorian date of passing on the public add-name form (delegated, works for cloned blocks). */
(function () {
  'use strict';
  function locale() {
    var lang = (document.documentElement.getAttribute('lang') || 'he').slice(0, 2);
    return (lang === 'ru' || lang === 'en' ? lang : 'he') + '-u-ca-hebrew';
  }
  function blockOf(el) { return el && el.closest ? el.closest('.public-deceased-block') : null; }
  function mode(block) {
    var c = block.querySelector('.public-death-mode-input:checked');
    return c ? c.value : 'gregorian';
  }
  function preview(block) {
    var box = block.querySelector('[data-public-hebrew-preview]');
    var input = block.querySelector('.public-death-date-input');
    if (!box || !input) return;
    var m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(String(input.value || '').trim());
    var text = '';
    if (m) {
      var d = new Date(+m[3], +m[2] - 1, +m[1], 12);
      if (d.getDate() === +m[1] && d.getMonth() === +m[2] - 1) {
        if (block.querySelector('input[name$="[diedAfterSunset]"][value="after"]:checked')) d.setDate(d.getDate() + 1);
        try { text = new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'long', year: 'numeric' }).format(d); } catch (e) { text = ''; }
      }
    }
    box.querySelector('strong').textContent = text;
    box.hidden = !text || mode(block) !== 'gregorian';
  }
  function apply(block) {
    var current = mode(block);
    block.querySelectorAll('[data-public-death-panel]').forEach(function (panel) {
      panel.hidden = panel.getAttribute('data-public-death-panel') !== current;
    });
    var greg = block.querySelector('.public-death-date-input');
    if (greg) greg.required = current === 'gregorian';
    block.querySelectorAll('.public-heb-day, .public-heb-month, .public-heb-year').forEach(function (f) {
      f.required = current === 'hebrew';
    });
    preview(block);
  }
  document.addEventListener('change', function (ev) {
    var block = blockOf(ev.target);
    if (!block) return;
    if (ev.target.classList.contains('public-death-mode-input')) apply(block); else preview(block);
  });
  document.addEventListener('input', function (ev) {
    var block = blockOf(ev.target);
    if (block && ev.target.classList.contains('public-death-date-input')) preview(block);
  });
  document.querySelectorAll('.public-deceased-block').forEach(apply);
})();
