/* 1.34.0 I47: one big, always-visible "save" bar at the bottom of every admin settings screen on a
 * phone. The small per-section save buttons stay on desktop but are hidden on phones, so there is
 * never a settings screen without a save option.
 *
 * A form opts in with data-mobile-save="1" and data-mobile-save-label="..."; its primary action is
 * the element marked data-mobile-save-primary, else its first submit button. Only the form of the
 * visible tab counts, so on the board-content page the bar always saves the tab you are looking at. */
(function () {
  'use strict';

  var mq = window.matchMedia('(max-width: 767.98px)');
  var body = document.body;
  var bar = null;
  var barButton = null;
  var activeForm = null;

  function isPhone() {
    return mq.matches;
  }

  function isVisible(el) {
    if (!el) return false;
    if (el.hasAttribute('hidden')) return false;
    if (el.closest('[hidden]')) return false;
    return el.offsetParent !== null || el.getClientRects().length > 0;
  }

  function primaryAction(form) {
    var marked = form.querySelector('[data-mobile-save-primary]');
    if (marked) return marked;
    var submits = form.querySelectorAll('button[type="submit"], input[type="submit"]');
    for (var i = 0; i < submits.length; i += 1) {
      if (!submits[i].disabled) return submits[i];
    }
    return null;
  }

  function currentForm() {
    var forms = document.querySelectorAll('form[data-mobile-save]');
    for (var i = 0; i < forms.length; i += 1) {
      // A modal brings its own save button in its footer, so it never needs the bar.
      if (forms[i].closest('.modal')) continue;
      if (!isVisible(forms[i])) continue;
      var action = primaryAction(forms[i]);
      if (action) return { form: forms[i], action: action };
    }
    return null;
  }

  function ensureBar() {
    if (bar) return;
    bar = document.createElement('div');
    bar.className = 'admin-mobile-savebar';
    bar.setAttribute('role', 'group');
    barButton = document.createElement('button');
    barButton.type = 'button';
    barButton.className = 'admin-mobile-savebar-btn';
    barButton.addEventListener('click', function () {
      var current = currentForm();
      if (!current) return;
      if (typeof current.form.requestSubmit === 'function' && current.action.type === 'submit') {
        try {
          current.form.requestSubmit(current.action);
          return;
        } catch (err) {
          /* fall through to a plain click */
        }
      }
      current.action.click();
    });
    bar.appendChild(barButton);
    body.appendChild(bar);
  }

  function sync() {
    var target = isPhone() ? currentForm() : null;
    if (!target) {
      if (bar) bar.hidden = true;
      body.classList.remove('has-mobile-savebar');
      activeForm = null;
      return;
    }
    ensureBar();
    if (activeForm !== target.form) {
      activeForm = target.form;
      barButton.textContent = target.form.getAttribute('data-mobile-save-label')
        || target.action.textContent
        || 'Save';
    } else if (!barButton.textContent) {
      barButton.textContent = target.form.getAttribute('data-mobile-save-label') || 'Save';
    }
    bar.hidden = false;
    body.classList.add('has-mobile-savebar');
  }

  window.adminSyncMobileSave = sync;

  if (mq.addEventListener) mq.addEventListener('change', sync);
  else if (mq.addListener) mq.addListener(sync);

  document.addEventListener('DOMContentLoaded', sync);
  window.addEventListener('load', sync);
  // Tabs, accordions and modals change which form is on screen.
  document.addEventListener('click', function (event) {
    if (event.target && event.target.closest('.content-tab, [data-tab], .admin-panel-toggle')) {
      window.setTimeout(sync, 30);
    }
  });
  document.addEventListener('change', function (event) {
    if (event.target && event.target.closest('.settings-form, .admin-panel')) {
      window.setTimeout(sync, 30);
    }
  });
  // Tabs and collapsible panels show/hide with the `hidden` attribute; watch only that (never
  // `class`, which every animation touches) and coalesce bursts into one frame.
  var scheduled = false;
  function scheduleSync() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(function () {
      scheduled = false;
      sync();
    });
  }
  if (typeof MutationObserver === 'function') {
    var observer = new MutationObserver(scheduleSync);
    observer.observe(document.documentElement, {
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden'],
    });
  }
  sync();
}());
