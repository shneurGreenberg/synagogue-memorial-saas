/* 1.30.0 I16 stage 1: click a part of the live board preview to open a small panel with that
 * part's existing settings. Every control in the panel is a proxy bound to the real field of the
 * settings form (same name/state), so the regular form, the preview and saving all keep working
 * exactly as before. No inline text editing in this stage. */
(function () {
  'use strict';

  var cfg = window.ADMIN_PREVIEW_EDITOR || {};
  var labels = cfg.labels || {};

  // 1.31.4 I36: each board column's panel offers only the parts that live in that column
  // (no more daily study / weather in both). Part on/off switches come first, so a part that is
  // switched off (and so no longer on the board) can always be switched back on from its column.
  var SIDE_STYLE_FIELDS = ['fontScale_sidebar', 'accentColor', 'panelBorderColor', 'panelBorderWidth', 'panelBorderRadius'];
  // DOM "aside.left": community logo, memorial prayers (Kel Male / Yizkor), daily study, Hayom Yom, donation QR.
  var LEFT_PARTS = ['feature_kelMaleRachamim', 'feature_izkor', 'feature_dailyChumash', 'feature_dailyTehillim',
    'feature_dailyRambam', 'feature_dailyTanya', 'feature_hayomYom', 'publicSubmissionShowDonationQr'];
  // DOM "aside.right": Kaddish logo, clock, Shabbat times, weather, upcoming holidays / Chabad dates / events, registration QR.
  var RIGHT_PARTS = ['feature_officialLogo', 'shabbatTimesEnabled', 'feature_weather', 'feature_upcomingHolidays',
    'feature_chabadDates', 'feature_communityEvents', 'publicSubmissionShowRegistrationQr'];
  var MIDDLE_PARTS = ['boardHideSearchAndPager'];
  var SIDE_FIELDS = LEFT_PARTS.concat(RIGHT_PARTS, SIDE_STYLE_FIELDS);
  var BG_TILES = ['.settings-media-tile--bg-page', '.settings-media-tile--bg-tiles', '.settings-media-tile--bg-middle'];
  // 1.37.1: «שמור על צבעים אחידים» and the «✨ זהב מטאלי» options are offered wherever a colour
  // is edited from the preview (1.37.0 only had them in the «מראה» section, which the preview
  // editor hides, so they could not be found).
  var UNIFIED = 'unifiedColorsToggle';
  var GOLD_PRIMARY = 'goldPrimaryToggle';
  var GOLD_TEXT = 'goldTextToggle';
  var GOLD_CLOCK = 'goldClockToggle';
  // 1.38.0 I84: «סגנון הזהב» (subtle / shiny / matte / solid) sits right after the gold switches.
  var GOLD_STYLE = 'goldStyle';
  var MAIN_COLORS = [UNIFIED, 'primaryColor', GOLD_PRIMARY, 'textColor', GOLD_TEXT, GOLD_STYLE];

  // Most specific first: the first matching region wins.
  var REGIONS = [
    { key: 'clock', selector: '.board-clock-block', fields: ['clockColor', GOLD_CLOCK].concat(MAIN_COLORS, ['fontScale_clock']) },
    { key: 'shabbat', selector: '.board-shabbat-block', fields: ['shabbatTimesEnabled', 'shabbatColor'].concat(MAIN_COLORS, ['fontScale_shabbat']) },
    // 1.31.2 I27: logo and candle settings are whole tiles of the form; they are moved into the panel
    // while it is open ("move") and put back when it closes, so saving is unchanged.
    { key: 'logo', selector: '.community-logo-img, .community-logo-flip', fields: [], move: ['.settings-media-tile--logo'] },
    { key: 'header', selector: '.board-header', fields: ['boardTitleText'].concat(MAIN_COLORS, ['fontScale_boardHeader',
      'boardSubtitleEnabled', 'boardSubtitleText', 'boardSubtitleColor', 'boardSubtitleWeight', 'fontScale_boardSubtitle']) },
    { key: 'bottom', selector: '.synagogue-info-panel', fields: ['boardMode', 'sectionTitle_zmanim', 'sectionTitle_prayers', 'sectionTitle_classes', 'combinedZmanimScale', 'combinedPrayersScale', 'combinedAnnouncementScale', 'accentColor'].concat(MAIN_COLORS) },
    { key: 'candle', selector: '.css-candle, .prayer-reading-candle', fields: [], move: ['.settings-candle-preview-tile'] },
    { key: 'tiles', selector: '.cards-grid .card, .cards-grid-kadish .card', fields: MAIN_COLORS.concat(['tileColor',
      'tileOpacity', 'tileBorderColor', 'tileBorderWidth', 'tileBorderRadius', 'fontScale_tileTitle', 'fontScale_tileDate', 'fontScale_torahNames',
      'boardCalendar', 'dateDisplay']) },
    { key: 'hayomYom', selector: '.hayom-yom-panel', fields: ['feature_hayomYom', 'fontScale_hayomYom', 'accentColor'].concat(MAIN_COLORS) },
    { key: 'dailyStudy', selector: '.daily-gates-panel', fields: ['feature_dailyChumash', 'feature_dailyTehillim',
      'feature_dailyRambam', 'feature_dailyTanya', 'fontScale_dailyStudy', 'accentColor'].concat(MAIN_COLORS) },
    { key: 'weather', selector: '.weather-panel', fields: ['feature_weather', 'fontScale_weather', UNIFIED, 'textColor', GOLD_TEXT, GOLD_STYLE] },
    { key: 'prayers', selector: '.memorial-prayers', fields: ['feature_kelMaleRachamim', 'feature_izkor', 'fontScale_prayers', 'fontScale_prayerOverlay'] },
    { key: 'donationQr', selector: '.donation-qr-panel', fields: ['publicSubmissionShowDonationQr', 'donationQrTitle',
      'publicSubmissionDonationUrl', 'memorialQrTitleScale', 'memorialQrQrScale'], move: ['input[name="donationQrImage"]'] },
    { key: 'memorialQr', selector: '.memorial-submission-panel', fields: ['publicSubmissionShowRegistrationQr', 'memorialQrTitle',
      'memorialQrTitleScale', 'memorialQrQrScale'], move: ['input[name="registrationQrImage"]'] },
    // 1.31.3 I30: background images (sides, tiles, middle) are replaced from the preview.
    // 1.31.4 I33: every background (page, tiles, middle) can always be replaced or removed from both
    // the column panels and the middle panel.
    { key: 'side', selector: '.side-panel', fields: SIDE_FIELDS, move: BG_TILES,
      fieldsFor: function (el) {
        var parts = el && el.classList && el.classList.contains('left') ? LEFT_PARTS : RIGHT_PARTS;
        return parts.concat(SIDE_STYLE_FIELDS);
      } },
    { key: 'middle', selector: '.middle', fields: MIDDLE_PARTS.concat(['boardCalendar', 'dateDisplay', 'panelBorderColor', 'panelBorderWidth', 'panelBorderRadius', 'tileColor', 'boardMode']),
      move: ['.settings-media-tile--bg-middle', '.settings-media-tile--bg-page', '.settings-media-tile--bg-tiles'] },
  ];

  // Resolve the form nodes each region moves into its panel. Their fields get form="settingsForm"
  // so they are still submitted while they sit in the panel (outside the <form>).
  REGIONS.forEach(function (r) {
    r.moveNodes = [];
    (r.move || []).forEach(function (sel) {
      var el = document.querySelector('#settingsForm ' + sel);
      if (!el) return;
      if (el.tagName === 'INPUT') el = el.closest('label.file-drop-label') || el.parentNode;
      el.querySelectorAll('input, select, textarea').forEach(function (f) { f.setAttribute('form', 'settingsForm'); });
      r.moveNodes.push(el);
    });
  });

  function isTextSize(id) { return /^fontScale_/.test(id || '') || /Scale$/.test(id || ''); }

  function findRegion(target) {
    for (var i = 0; i < REGIONS.length; i += 1) {
      var el = target && target.closest ? target.closest(REGIONS[i].selector) : null;
      if (el) return { region: REGIONS[i], el: el };
    }
    return null;
  }

  function fieldLabel(real) {
    var explicit = real.getAttribute && real.getAttribute('data-preview-label');
    if (explicit) return String(explicit).trim();
    var id = real.id;
    var lbl = id ? document.querySelector('label[for="' + id + '"]') : null;
    var text = lbl && !lbl.classList.contains('toggle-switch') ? lbl.textContent : '';
    var emb = !text && real.closest('.settings-embedded-slider');
    var embLabel = emb && emb.querySelector('.settings-embedded-slider-label');
    if (embLabel) text = embLabel.textContent;
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

  var panelSyncs = [];
  function syncPanel() { panelSyncs.forEach(function (fn) { fn(); }); }
  function fire(real) {
    real.dispatchEvent(new Event('input', { bubbles: true }));
    real.dispatchEvent(new Event('change', { bubbles: true }));
    // 1.37.1: e.g. «שמור על צבעים אחידים» locks / unlocks the accent, clock and Shabbat colours.
    syncPanel();
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
    if (tag === 'textarea') {
      proxy = document.createElement('textarea');
      proxy.className = 'form-control';
      proxy.rows = 3;
      proxy.setAttribute('dir', real.getAttribute('dir') || 'auto');
      proxy.value = real.value;
      proxy.addEventListener('input', function () { real.value = proxy.value; fire(real); });
      return proxy;
    }
    if (real.type === 'number' && isTextSize(real.id)) {
      // 1.31.2 I28: text size is only + and − buttons, no number.
      proxy = document.createElement('span');
      proxy.className = 'preview-editor-size-buttons';
      [['−', -1], ['+', 1]].forEach(function (pair) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'admin-number-stepper-btn';
        b.textContent = pair[0];
        b.addEventListener('click', function (ev) {
          ev.preventDefault();
          var step = parseFloat(real.getAttribute('step')) || 1;
          var cur = parseFloat(real.value);
          if (!isFinite(cur)) cur = parseFloat(real.getAttribute('min')) || 0;
          var next = cur + pair[1] * step;
          var S = window.AdminNumberStepper;
          real.value = S && S.clampValue ? S.clampValue(real, next) : next;
          fire(real);
        });
        proxy.appendChild(b);
      });
      return proxy;
    }
    proxy = document.createElement('input');
    proxy.type = real.type === 'checkbox' ? 'checkbox' : (real.type || 'text');
    if (proxy.type === 'checkbox') {
      proxy.checked = real.checked;
      proxy.className = 'admin-switch';
      proxy.addEventListener('change', function () {
        real.checked = proxy.checked;
        fire(real);
        var row = proxy.closest('.preview-editor-row');
        if (row) { row.classList.toggle('is-on', proxy.checked); row.classList.toggle('is-off', !proxy.checked); }
      });
      return proxy;
    }
    ['min', 'max', 'step', 'maxLength'].forEach(function (a) { if (real[a] && real[a] > -1) proxy[a] = real[a]; });
    if (real.getAttribute('dir')) proxy.setAttribute('dir', real.getAttribute('dir'));
    if (real.getAttribute('placeholder')) proxy.setAttribute('placeholder', real.getAttribute('placeholder'));
    proxy.className = proxy.type === 'color' ? 'preview-editor-color' : 'form-control';
    proxy.value = real.value;
    proxy.addEventListener('input', function () { real.value = proxy.value; fire(real); });
    return proxy;
  }

  var panel;
  var movedBack = [];
  function closePanel() {
    movedBack.forEach(function (m) {
      if (m.ph.parentNode) {
        m.ph.parentNode.insertBefore(m.node, m.ph);
        m.ph.parentNode.removeChild(m.ph);
      }
      if (isEnabled()) m.node.classList.add('preview-covered');
    });
    movedBack = [];
    if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
    panel = null;
    panelSyncs = [];
  }

  function openPanel(region, x, y, sideLabel, hitEl) {
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
    var fields = region.fieldsFor ? region.fieldsFor(hitEl) : region.fields;
    fields.forEach(function (id) {
      if (seen[id]) return;
      seen[id] = true;
      var real = form && form.querySelector('#' + id);
      if (!real || real.type === 'hidden') return;
      var row = document.createElement('label');
      row.className = 'preview-editor-row' + (real.type === 'checkbox' ? ' preview-editor-row--switch' + (real.checked ? ' is-on' : ' is-off') : '');
      if (real.type === 'checkbox') row.setAttribute('data-part', id);
      var span = document.createElement('span');
      span.textContent = fieldLabel(real);
      row.appendChild(span);
      var control = buildControl(real);
      row.appendChild(control);
      body.appendChild(row);
      var syncRow = function () {
        var locked = !!real.disabled;
        row.classList.toggle('is-locked', locked);
        if ('disabled' in control) control.disabled = locked;
        if (control.type === 'checkbox') control.checked = real.checked;
        else if (control.type === 'color' && control.value !== real.value) control.value = real.value;
      };
      syncRow();
      panelSyncs.push(syncRow);
    });
    (region.moveNodes || []).forEach(function (node) {
      var ph = document.createComment('preview-moved');
      node.parentNode.insertBefore(ph, node);
      node.classList.remove('preview-covered', 'preview-covered-empty');
      node.classList.add('preview-editor-moved');
      body.appendChild(node);
      movedBack.push({ node: node, ph: ph });
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
    if (!doc || doc.__previewEditorAttached || !(doc.head || doc.documentElement)) return;
    doc.__previewEditorAttached = true;
    var style = doc.createElement('style');
    style.textContent = 'html.preview-edit-on .board-clock-block:hover, html.preview-edit-on .board-shabbat-block:hover,'
      + 'html.preview-edit-on .board-header:hover, html.preview-edit-on .synagogue-info-panel:hover,'
      + 'html.preview-edit-on .cards-grid .card:hover, html.preview-edit-on .hayom-yom-panel:hover,'
      + 'html.preview-edit-on .daily-gates-panel:hover, html.preview-edit-on .weather-panel:hover,'
      + 'html.preview-edit-on .memorial-submission-panel:hover, html.preview-edit-on .side-panel:hover,'
      + 'html.preview-edit-on .memorial-prayers:hover'
      + '{outline:3px dashed rgba(64,160,255,.9);outline-offset:2px;cursor:pointer}';
    (doc.head || doc.documentElement).appendChild(style);
    function syncClass() { doc.documentElement.classList.toggle('preview-edit-on', isEnabled()); }
    syncClass();
    var toggle = document.getElementById('previewEditToggle');
    if (toggle) toggle.addEventListener('change', function () { syncClass(); if (!toggle.checked) closePanel(); });
    doc.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closePanel(); });
    doc.addEventListener('click', function (ev) {
      if (!isEnabled()) return;
      var hit = findRegion(ev.target);
      // The candle sits under other layers of the tile, so match it by position too.
      var candleRegion = REGIONS.filter(function (r) { return r.key === 'candle'; })[0];
      if (candleRegion && (!hit || hit.region.key === 'tiles')) {
        Array.prototype.some.call(doc.querySelectorAll('.css-candle-wax, .css-candle-flame, .css-candle-glow'), function (c) {
          var cr = c.getBoundingClientRect();
          if (cr.width && ev.clientX >= cr.left && ev.clientX <= cr.right && ev.clientY >= cr.top && ev.clientY <= cr.bottom) {
            hit = { region: candleRegion, el: c };
            return true;
          }
          return false;
        });
      }
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
      openPanel(hit.region, rect.left + ev.clientX * k, rect.top + ev.clientY * k, sideLabel, hit.el);
    }, true);
  }

  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closePanel(); });
  document.addEventListener('mousedown', function (ev) {
    // 1.36.0 I70: the admin colour picker popover belongs to the colour field inside this panel.
    if (ev.target && ev.target.closest && ev.target.closest('.admin-color-popover')) return;
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
  var KEEP_IN_FORM = { boardMode: true, unifiedColorsToggle: true, goldPrimaryToggle: true, goldTextToggle: true, goldClockToggle: true, goldStyle: true };
  function coveredIds() {
    var out = {};
    REGIONS.forEach(function (r) {
      r.fields.forEach(function (id) {
        if (KEEP_IN_FORM[id]) return;
        var real = document.getElementById(id);
        if (!real || real.type === 'hidden') return;
        out[id] = true;
      });
    });
    // 1.31.0 I20 / 1.31.4 I36: every on/off part toggle lives in the preview panels only; a
    // switched-off part is switched back on from its column's panel.
    TOGGLE_IDS().forEach(function (id) { out[id] = true; });
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
    REGIONS.forEach(function (r) {
      r.moveNodes.forEach(function (node) { if (form.contains(node)) node.classList.toggle('preview-covered', on); });
    });
    // 1.31.2 I27: also drop rows, tiles, groups and whole sections left with no control.
    var GROUPS = '.admin-panel, .settings-block, .settings-media-grid, .settings-media-tile, .settings-copy-group, '
      + '.settings-copy-details, .board-features-group, .typography-group, .font-scale-grid, .slider-field-modern, .settings-embedded-slider';
    form.querySelectorAll(GROUPS).forEach(function (g) {
      g.classList.remove('preview-covered-empty');
    });
    if (!on) return;
    Array.prototype.slice.call(form.querySelectorAll(GROUPS)).reverse().forEach(function (g) {
      var visible = Array.prototype.some.call(g.querySelectorAll('input, select, textarea'), function (el) {
        return el.type !== 'hidden' && !el.closest('.preview-covered') && !el.closest('.preview-covered-empty');
      });
      if (!visible) g.classList.add('preview-covered-empty');
    });
  }
  function TOGGLE_IDS() {
    var ids = ['shabbatTimesEnabled', 'boardHideSearchAndPager', 'publicSubmissionShowDonationQr', 'publicSubmissionShowRegistrationQr'];
    document.querySelectorAll('#settingsForm input[type="checkbox"][id^="feature_"]').forEach(function (el) { ids.push(el.id); });
    return ids.filter(function (id) { return document.getElementById(id); });
  }
  /* 1.31.4 I36: the "hidden parts" / "shown parts" rows above the preview are gone; every part is
   * switched on and off from the panel of the board column (or area) it belongs to. */
  function renderHiddenParts() {
    var box = document.getElementById('previewHiddenParts');
    if (box && box.parentNode) box.parentNode.removeChild(box);
  }
  document.addEventListener('change', function (ev) {
    if (ev.target && ev.target.type === 'checkbox') renderHiddenParts();
  });
  var css = document.createElement('style');
  css.textContent = '#settingsForm .preview-covered, #settingsForm .preview-covered-empty{display:none!important}'
    + '.preview-hidden-parts{display:flex;flex-direction:column;gap:6px;margin:6px 0}'
    + '.preview-hidden-parts-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center}'
    + '.preview-editor-size-buttons{display:inline-flex;gap:6px}'
    + '.preview-editor-moved{margin-top:8px;max-width:100%}'
    + '.preview-editor-panel{max-height:80vh;overflow:auto}'
    + '.preview-editor-row--switch.is-off>span{opacity:.7}'
    + '.preview-hidden-parts[hidden]{display:none}';
  document.head.appendChild(css);
  var editToggle = document.getElementById('previewEditToggle');
  if (editToggle) editToggle.addEventListener('change', function () { applyCovered(); renderHiddenParts(); });
  applyCovered();
  renderHiddenParts();
  // 1.37.1: the dashboard keeps the regular sections hidden until this first pass (no flash).
  document.documentElement.classList.remove('preview-edit-pending');

  window.__adminPreviewEditor = { REGIONS: REGIONS, findRegion: findRegion, coveredIds: coveredIds, renderHiddenParts: renderHiddenParts, applyCovered: applyCovered };
})();
