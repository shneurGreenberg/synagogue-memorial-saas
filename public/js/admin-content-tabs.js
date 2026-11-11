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
  var labels = window.prayerFormLabels || {};
  function templateFor(kind) {
    return document.getElementById('prayerRowTemplate-' + kind) || document.getElementById('prayerRowTemplate-prayer');
  }
  function listFor(kind) {
    return document.getElementById(kind === 'prayer' ? 'prayerRows' : 'classRows');
  }
  function rowsOf(list) {
    return Array.prototype.filter.call(list.children, function (el) { return el.classList.contains('prayer-times-row'); });
  }

  // 1.36.0 I62: ▲/▼ fallback (keyboard + anyone who prefers taps over dragging).
  function moveRow(row, dir) {
    var list = row.parentNode;
    var rows = rowsOf(list);
    var i = rows.indexOf(row);
    var j = i + dir;
    if (i < 0 || j < 0 || j >= rows.length) return;
    if (dir < 0) list.insertBefore(row, rows[j]);
    else list.insertBefore(row, rows[j].nextSibling);
    flash(row);
  }
  function flash(row) {
    row.classList.remove('is-moved');
    void row.offsetWidth; // restart the animation
    row.classList.add('is-moved');
  }

  form.addEventListener('click', function (e) {
    var rm = e.target.closest('.prayer-row-remove');
    if (rm) { rm.closest('.prayer-times-row').remove(); return; }
    var up = e.target.closest('.prayer-row-up');
    if (up) { moveRow(up.closest('.prayer-times-row'), -1); up.focus(); return; }
    var down = e.target.closest('.prayer-row-down');
    if (down) { moveRow(down.closest('.prayer-times-row'), 1); down.focus(); return; }
    var add = e.target.closest('.prayer-add-btn');
    if (add) {
      var kind = add.getAttribute('data-add-kind');
      var tpl = templateFor(kind);
      if (!tpl) return;
      var row = tpl.content.querySelector('.prayer-times-row').cloneNode(true);
      listFor(kind).appendChild(row);
      var label = row.querySelector('[data-f="label"]');
      if (label) {
        if (labels[kind]) { label.placeholder = labels[kind]; label.setAttribute('aria-label', labels[kind]); }
        label.focus();
      }
    }
  });

  // 1.36.0 I62/I63: drag-to-reorder with Pointer Events (mouse, finger and pen alike). The row moves
  // inside its own list (prayers stay prayers; lessons and their sub-headings share one list).
  var drag = null;
  var scrollTimer = null;
  function stopAutoScroll() { if (scrollTimer) { window.clearInterval(scrollTimer); scrollTimer = null; } }
  function autoScroll(clientY) {
    stopAutoScroll();
    var edge = 70;
    var step = clientY < edge ? -12 : (clientY > window.innerHeight - edge ? 12 : 0);
    if (!step) return;
    scrollTimer = window.setInterval(function () {
      window.scrollBy(0, step);
      if (drag) reposition(drag.lastY);
    }, 16);
  }
  function reposition(clientY) {
    if (!drag) return;
    var rows = rowsOf(drag.list).filter(function (r) { return r !== drag.row; });
    var before = null;
    for (var k = 0; k < rows.length; k += 1) {
      var rect = rows[k].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) { before = rows[k]; break; }
    }
    if (before) {
      if (drag.row.nextSibling !== before) drag.list.insertBefore(drag.row, before);
    } else if (rows.length && drag.row !== drag.list.lastElementChild) {
      drag.list.appendChild(drag.row);
    }
  }
  // Listen on the window (not via pointer capture): moving the row in the DOM would drop a capture.
  form.addEventListener('pointerdown', function (e) {
    var handle = e.target.closest('.prayer-row-handle');
    if (!handle || (e.pointerType === 'mouse' && e.button !== 0)) return;
    var row = handle.closest('.prayer-times-row');
    if (!row) return;
    e.preventDefault();
    drag = { row: row, list: row.parentNode, pointerId: e.pointerId, lastY: e.clientY };
    row.classList.add('is-dragging');
    form.classList.add('is-reordering');
  });
  window.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (e.cancelable) e.preventDefault();
    drag.lastY = e.clientY;
    reposition(e.clientY);
    autoScroll(e.clientY);
  }, { passive: false });
  function endDrag(e) {
    if (!drag || (e && e.pointerId !== drag.pointerId)) return;
    stopAutoScroll();
    drag.row.classList.remove('is-dragging');
    form.classList.remove('is-reordering');
    flash(drag.row);
    drag = null;
  }
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  // Touch: keep the page from scrolling while a row is being dragged (old iOS ignores touch-action).
  form.addEventListener('touchmove', function (e) { if (drag && e.cancelable) e.preventDefault(); }, { passive: false });

  // Name the fields in board order (prayers, then lessons with their sub-headings) right before submit.
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
