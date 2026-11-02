/* 1.32.0 I42: "תוכן הלוח" tabs + prayers/classes rows (add / remove, kind-aware). */
(function () {
  var tabs = document.querySelectorAll('#contentTabs .content-tab');
  var panes = document.querySelectorAll('.content-tab-pane');
  function show(name, push) {
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-tab') === name;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    panes.forEach(function (p) { p.hidden = p.getAttribute('data-pane') !== name; });
    if (push) {
      var url = new URL(window.location.href);
      url.searchParams.set('tab', name);
      url.searchParams.delete('saved');
      window.history.replaceState(null, '', url.toString());
    }
    if (window.adminSyncMobileFab) window.adminSyncMobileFab();
  }
  tabs.forEach(function (t) {
    t.addEventListener('click', function () { show(t.getAttribute('data-tab'), true); });
  });

  var form = document.getElementById('prayerTimesForm');
  if (!form) return;
  var tpl = document.getElementById('prayerRowTemplate');
  var labels = window.prayerFormLabels || {};
  form.addEventListener('click', function (e) {
    var rm = e.target.closest('.prayer-row-remove');
    if (rm) { rm.closest('.prayer-times-row').remove(); return; }
    var add = e.target.closest('.prayer-add-btn');
    if (add && tpl) {
      var kind = add.getAttribute('data-add-kind');
      var box = document.getElementById(kind === 'class' ? 'classRows' : 'prayerRows');
      var row = tpl.content.firstElementChild.cloneNode(true);
      row.setAttribute('data-kind', kind);
      row.querySelector('[data-f="kind"]').value = kind;
      var label = row.querySelector('[data-f="label"]');
      label.placeholder = labels[kind] || '';
      label.setAttribute('aria-label', labels[kind] || '');
      box.appendChild(row);
      label.focus();
    }
  });
  // Name the fields in board order (prayers, then classes) right before submit.
  form.addEventListener('submit', function () {
    var i = 0;
    form.querySelectorAll('.prayer-times-row').forEach(function (row) {
      ['kind', 'label', 'time'].forEach(function (f) {
        var el = row.querySelector('[data-f="' + f + '"]');
        if (el) el.name = (f === 'kind' ? 'prayerKind_' : f === 'label' ? 'prayerLabel_' : 'prayerTime_') + i;
      });
      i += 1;
    });
  });
})();
