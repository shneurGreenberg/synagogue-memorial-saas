/* 1.30.0 I16 stage 1: click a part of the live board preview to open a small panel with that
 * part's existing settings. Every control in the panel is a proxy bound to the real field of the
 * settings form (same name/state), so the regular form, the preview and saving all keep working
 * exactly as before. No inline text editing in this stage. */
(function () {
  'use strict';

  var cfg = window.ADMIN_PREVIEW_EDITOR || {};
  var labels = cfg.labels || {};

  var SIDE_FIELDS = ['feature_upcomingHolidays', 'feature_chabadDates', 'feature_communityEvents',
    'feature_dailyChumash', 'feature_dailyTehillim', 'feature_dailyRambam', 'feature_dailyTanya',
    'feature_hayomYom', 'feature_weather', 'fontScale_sidebar', 'accentColor', 'panelBorderColor',
    'panelBorderWidth', 'panelBorderRadius'];

  // Most specific first: the first matching region wins.
  var REGIONS = [
    { key: 'clock', selector: '.board-clock-block', fields: ['clockColor', 'fontScale_clock'] },
    { key: 'shabbat', selector: '.board-shabbat-block', fields: ['shabbatTimesEnabled', 'shabbatColor', 'fontScale_shabbat'] },
    { key: 'header', selector: '.board-header', fields: ['boardTitleText', 'primaryColor', 'fontScale_boardHeader',
      'boardSubtitleEnabled', 'boardSubtitleText', 'boardSubtitleColor', 'fontScale_boardSubtitle'] },
    { key: 'bottom', selector: '.synagogue-info-panel', fields: ['boardMode', 'combinedInfoScale', 'combinedAnnouncementScale', 'accentColor'] },
    { key: 'tiles', selector: '.cards-grid .card, .cards-grid-kadish .card', fields: ['primaryColor', 'textColor', 'tileColor',
      'tileOpacity', 'tileBorderColor', 'tileBorderWidth', 'tileBorderRadius', 'fontScale_tileTitle', 'fontScale_tileDate',
      'boardCalendar', 'dateDisplay'] },
    { key: 'hayomYom', selector: '.hayom-yom-panel', fields: ['feature_hayomYom', 'fontScale_hayomYom', 'accentColor'] },
    { key: 'dailyStudy', selector: '.daily-gates-panel', fields: ['feature_dailyChumash', 'feature_dailyTehillim',
      'feature_dailyRambam', 'feature_dailyTanya', 'fontScale_dailyStudy', 'accentColor'] },
    { key: 'weather', selector: '.weather-panel', fields: ['feature_weather', 'fontScale_weather'] },
    { key: 'prayers', selector: '.memorial-prayers', fields: ['feature_kelMaleRachamim', 'feature_izkor', 'fontScale_prayers'] },
    { key: 'side', selector: '.side-panel', fields: SIDE_FIELDS },
    { key: 'middle', selector: '.middle', fields: ['panelBorderColor', 'panelBorderWidth', 'panelBorderRadius', 'tileColor', 'boardMode'] },
  ];

  function findRegion(target) {
    for (var i = 0; i < REGIONS.length; i += 1) {
      var el = target && target.closest ? target.closest(REGIONS[i].selector) : null;
      if (el) return { region: REGIONS[i], el: el };
    }
    return null;
  }

  function fieldLabel(real) {
    var id = real.id;
    var lbl = id ? document.querySelector('label[for="' + id + '"]') : null;
    var text = lbl && !lbl.classList.contains('toggle-switch') ? lbl.textContent : '';
    if (!text) {
      var setting = real.closest('.admin-theme-setting');
      var sl = setting && setting.querySelector('.admin-theme-setting-label');
      text = sl ? sl.textContent : '';
    }
    if (!text) {
      var field = real.closest('.slider-field-modern, .form-field, .settings-color-tile');
      var fl = field && field.querySelector('label');
      text = fl ? fl.textContent : id;
    }
    return String(text || '').trim();
  }

  function fire(real) {
    real.dispatchEvent(new Event('input', { bubbles: true }));
    real.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function buildControl(real) {
    var proxy;
    var tag = real.tagName.toLowerCase();
    if (tag === 'select') {
      proxy = document.createElement('select');
      proxy.className = 'form-control admin-select-modern';
      Array.prototype.forEach.call(real.options, function (o) {
        var opt = document.createElement('option');
        opt.value = o.value;
        opt.textContent = o.textContent;
        proxy.appendChild(opt);
      });
      proxy.value = real.value;
      proxy.addEventListener('change', function () { real.value = proxy.value; fire(real); });
      return proxy;
    }
    proxy = document.createElement('input');
    proxy.type = real.type === 'checkbox' ? 'checkbox' : (real.type || 'text');
    if (proxy.type === 'checkbox') {
      proxy.checked = real.checked;
      proxy.addEventListener('change', function () { real.checked = proxy.checked; fire(real); });
      return proxy;
    }
    ['min', 'max', 'step', 'maxLength'].forEach(function (a) { if (real[a] && real[a] > -1) proxy[a] = real[a]; });
    if (real.getAttribute('dir')) proxy.setAttribute('dir', real.getAttribute('dir'));
    proxy.className = proxy.type === 'color' ? 'preview-editor-color' : 'form-control';
    proxy.value = real.value;
    proxy.addEventListener('input', function () { real.value = proxy.value; fire(real); });
    return proxy;
  }

  var panel;
  function closePanel() {
    if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
    panel = null;
  }

  function openPanel(region, x, y, sideLabel) {
    closePanel();
    var form = document.getElementById('settingsForm');
    panel = document.createElement('div');
    panel.className = 'preview-editor-panel';
    panel.setAttribute('role', 'dialog');
    var head = document.createElement('div');
    head.className = 'preview-editor-head';
    var title = document.createElement('strong');
    title.textContent = sideLabel || labels[region.key] || region.key;
    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'preview-editor-close';
    close.setAttribute('aria-label', labels.close || 'Close');
    close.textContent = '×';
    close.addEventListener('click', closePanel);
    head.appendChild(title);
    head.appendChild(close);
    panel.appendChild(head);

    var body = document.createElement('div');
    body.className = 'preview-editor-body';
    var seen = {};
    region.fields.forEach(function (id) {
      if (seen[id]) return;
      seen[id] = true;
      var real = form && form.querySelector('#' + id);
      if (!real || real.type === 'hidden') return;
      var row = document.createElement('label');
      row.className = 'preview-editor-row';
      var span = document.createElement('span');
      span.textContent = fieldLabel(real);
      row.appendChild(span);
      row.appendChild(buildControl(real));
      body.appendChild(row);
    });
    if (!body.children.length) {
      var empty = document.createElement('p');
      empty.className = 'field-hint';
      empty.textContent = labels.empty || '';
      body.appendChild(empty);
    }
    panel.appendChild(body);

    var foot = document.createElement('div');
    foot.className = 'preview-editor-foot';
    var save = document.createElement('button');
    save.type = 'button';
    save.className = 'btn-admin btn-admin-primary btn-admin-sm';
    save.textContent = labels.save || 'Save';
    save.addEventListener('click', function () {
      if (!form) return;
      if (typeof form.requestSubmit === 'function') form.requestSubmit();
      else form.submit();
    });
    foot.appendChild(save);
    panel.appendChild(foot);

    document.body.appendChild(panel);
    var w = panel.offsetWidth;
    var h = panel.offsetHeight;
    var left = Math.min(Math.max(8, x + 12), window.innerWidth - w - 8);
    var top = Math.min(Math.max(8, y + 12), window.innerHeight - h - 8);
    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
  }

  function isEnabled() {
    var t = document.getElementById('previewEditToggle');
    return !t || t.checked;
  }

  function attach(frame) {
    var doc;
    try { doc = frame.contentDocument; } catch (e) { return; }
    if (!doc || doc.__previewEditorAttached) return;
    doc.__previewEditorAttached = true;
    var style = doc.createElement('style');
    style.textContent = 'html.preview-edit-on .board-clock-block:hover, html.preview-edit-on .board-shabbat-block:hover,'
      + 'html.preview-edit-on .board-header:hover, html.preview-edit-on .synagogue-info-panel:hover,'
      + 'html.preview-edit-on .cards-grid .card:hover, html.preview-edit-on .hayom-yom-panel:hover,'
      + 'html.preview-edit-on .daily-gates-panel:hover, html.preview-edit-on .weather-panel:hover'
      + '{outline:3px dashed rgba(64,160,255,.9);outline-offset:2px;cursor:pointer}';
    (doc.head || doc.documentElement).appendChild(style);
    function syncClass() { doc.documentElement.classList.toggle('preview-edit-on', isEnabled()); }
    syncClass();
    var toggle = document.getElementById('previewEditToggle');
    if (toggle) toggle.addEventListener('change', function () { syncClass(); if (!toggle.checked) closePanel(); });
    doc.addEventListener('click', function (ev) {
      if (!isEnabled()) return;
      var hit = findRegion(ev.target);
      if (!hit) return;
      ev.preventDefault();
      ev.stopPropagation();
      var rect = frame.getBoundingClientRect();
      var innerW = (frame.contentWindow && frame.contentWindow.innerWidth) || rect.width;
      var k = innerW ? rect.width / innerW : 1;
      var sideLabel = '';
      if (hit.region.key === 'side') {
        var r = hit.el.getBoundingClientRect();
        sideLabel = (r.left + r.width / 2) > innerW / 2 ? labels.sideRight : labels.sideLeft;
      }
      openPanel(hit.region, rect.left + ev.clientX * k, rect.top + ev.clientY * k, sideLabel);
    }, true);
  }

  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closePanel(); });
  document.addEventListener('mousedown', function (ev) {
    if (panel && !panel.contains(ev.target)) closePanel();
  });

  var frame = document.getElementById('boardPreviewFrame');
  if (frame) {
    frame.addEventListener('load', function () { attach(frame); });
    attach(frame);
  }

  /* 1.30.1 I17: settings reachable from a preview panel are hidden in the regular sections below
   * (they stay in the form, so saving is unchanged). Toggles stay visible because their board part
   * can disappear when switched off; boardMode stays because it changes which parts exist.
   * Turning the preview-edit toggle off shows everything again. */
  var KEEP_IN_FORM = { boardMode: true };
  function coveredIds() {
    var out = {};
    REGIONS.forEach(function (r) {
      r.fields.forEach(function (id) {
        if (KEEP_IN_FORM[id]) return;
        var real = document.getElementById(id);
        if (!real || real.type === 'hidden') return;
        if (real.type === 'checkbox' && id !== 'boardSubtitleEnabled') return;
        out[id] = true;
      });
    });
    return out;
  }
  var WRAP = '.settings-color-tile, .slider-field-modern, .admin-theme-setting, .form-field';
  function applyCovered() {
    var form = document.getElementById('settingsForm');
    if (!form) return;
    var on = isEnabled() && !!document.getElementById('boardPreviewFrame');
    var ids = coveredIds();
    Object.keys(ids).forEach(function (id) {
      var real = document.getElementById(id);
      var wrap = real && real.closest(WRAP);
      if (wrap && form.contains(wrap)) wrap.classList.toggle('preview-covered', on);
    });
    form.querySelectorAll('.settings-block, .typography-group, .font-scale-grid').forEach(function (g) {
      g.classList.remove('preview-covered-empty');
    });
    if (!on) return;
    form.querySelectorAll('.typography-group, .font-scale-grid, .settings-block').forEach(function (g) {
      var visible = Array.prototype.some.call(g.querySelectorAll('input, select, textarea'), function (el) {
        return el.type !== 'hidden' && !el.closest('.preview-covered') && !el.closest('.preview-covered-empty');
      });
      if (!visible) g.classList.add('preview-covered-empty');
    });
  }
  var css = document.createElement('style');
  css.textContent = '#settingsForm .preview-covered, #settingsForm .preview-covered-empty{display:none!important}';
  document.head.appendChild(css);
  var editToggle = document.getElementById('previewEditToggle');
  if (editToggle) editToggle.addEventListener('change', applyCovered);
  applyCovered();

  window.__adminPreviewEditor = { REGIONS: REGIONS, findRegion: findRegion, coveredIds: coveredIds, applyCovered: applyCovered };
})();
