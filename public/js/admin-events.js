(function () {
  var overlay = document.getElementById('adminBusyOverlay');
  var busyText = document.getElementById('adminBusyText');
  var labels = window.eventsAdminLabels || {};
  var slug = window.eventsAdminSlug || window.location.pathname.split('/')[2];
  var eventsById = {};

  function showBusy(message) {
    if (!overlay) {
      return;
    }
    if (busyText && message) {
      busyText.textContent = message;
    }
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('admin-is-busy');
  }

  function hideBusy() {
    if (!overlay) {
      return;
    }
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('admin-is-busy');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDateTime(iso) {
    if (!iso) {
      return '—';
    }

    try {
      return new Date(iso).toLocaleString();
    } catch (e) {
      return String(iso);
    }
  }

  function formatEventDate(eventDate) {
    if (!eventDate) {
      return '';
    }

    var parts = [];
    if (eventDate.date) {
      parts.push(String(eventDate.date).padStart(2, '0'));
    }
    if (eventDate.month) {
      parts.push(String(eventDate.month).padStart(2, '0'));
    }
    if (eventDate.year) {
      parts.push(String(eventDate.year));
    }

    return parts.join('.');
  }

  function toDatetimeLocalValue(iso) {
    if (!iso) {
      return '';
    }

    var date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    var pad = function (n) { return String(n).padStart(2, '0'); };
    return date.getFullYear() + '-'
      + pad(date.getMonth() + 1) + '-'
      + pad(date.getDate()) + 'T'
      + pad(date.getHours()) + ':'
      + pad(date.getMinutes());
  }

  function resolvePreviewLang(boardLang) {
    if (boardLang === 'he' || boardLang === 'en') {
      return 'en';
    }
    return 'ru';
  }

  function formatPreviewDate(month, day, year, lang) {
    if (!month || !day) {
      return '';
    }

    var eventYear = year || new Date().getFullYear();
    var date = new Date(eventYear, Number(month) - 1, Number(day));
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    if (lang === 'en') {
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
    }

    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  }

  function updateEventsPreview() {
    var previewRoot = document.getElementById('eventsBoardPreview');
    if (!previewRoot) {
      return;
    }

    var boardLang = previewRoot.getAttribute('data-board-lang') || window.eventsBoardLang || 'ru';
    var previewLang = resolvePreviewLang(boardLang);
    var labels = (window.eventsPreviewLabels && window.eventsPreviewLabels[previewLang])
      || (window.eventsPreviewLabels && window.eventsPreviewLabels.ru)
      || {};

    var titleRu = document.getElementById('eventTitleRu');
    var titleEn = document.getElementById('eventTitleEn');
    var textRu = document.getElementById('eventTextRu');
    var textEn = document.getElementById('eventTextEn');
    var monthInput = document.getElementById('eventMonth');
    var dayInput = document.getElementById('eventDay');
    var yearInput = document.getElementById('eventYear');

    var title = previewLang === 'en'
      ? String((titleEn && titleEn.value) || (titleRu && titleRu.value) || '').trim()
      : String((titleRu && titleRu.value) || (titleEn && titleEn.value) || '').trim();
    var text = previewLang === 'en'
      ? String((textEn && textEn.value) || (textRu && textRu.value) || '').trim()
      : String((textRu && textRu.value) || (textEn && textEn.value) || '').trim();

    var sectionTitleEl = document.getElementById('eventsPreviewSectionTitle');
    var titleEl = document.getElementById('eventsPreviewTitle');
    var textEl = document.getElementById('eventsPreviewText');
    var dateEl = document.getElementById('eventsPreviewDate');

    if (sectionTitleEl) {
      sectionTitleEl.textContent = labels.sectionTitle || '';
    }
    if (titleEl) {
      titleEl.textContent = title || labels.titleSample || '';
    }
    if (textEl) {
      textEl.textContent = text || labels.textSample || '';
      textEl.hidden = !text && !labels.textSample;
    }
    if (dateEl) {
      var formatted = formatPreviewDate(
        monthInput && monthInput.value,
        dayInput && dayInput.value,
        yearInput && yearInput.value,
        previewLang,
      );
      dateEl.textContent = formatted || labels.dateSample || '';
      dateEl.hidden = !formatted && !labels.dateSample;
    }
  }

  function bindEventsPreview() {
    document.querySelectorAll('.event-preview-input, #eventMonth, #eventDay, #eventYear').forEach(function (input) {
      input.addEventListener('input', updateEventsPreview);
      input.addEventListener('change', updateEventsPreview);
    });
    updateEventsPreview();
  }

  function icon(name, className) {
    if (window.AdminIcons && typeof window.AdminIcons.render === 'function') {
      return window.AdminIcons.render(name, className || 'btn-admin-inline-icon');
    }
    return '';
  }

  var statusTimer = null;

  function showStatus(message, type) {
    var banner = document.getElementById('eventsStatusBanner');
    if (!banner) {
      return;
    }

    banner.textContent = message;
    banner.className = 'admin-alert events-status-banner events-status-banner--' + (type || 'success');
    banner.hidden = false;

    if (statusTimer) {
      window.clearTimeout(statusTimer);
    }

    statusTimer = window.setTimeout(function () {
      banner.hidden = true;
    }, 5000);
  }

  function scrollToActiveEvents() {
    var panel = document.getElementById('activeEventsPanel');
    if (panel && typeof panel.scrollIntoView === 'function') {
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function renderEventCard(event, options) {
    var id = String(event._id);
    var isHistory = options.isHistory;
    var showPublishNow = options.showPublishNow;
    var showEndNow = options.showEndNow;

    var description = event.text
      ? '<p class="event-card-text">' + escapeHtml(event.text) + '</p>'
      : '';

    var actions = '<div class="event-card-actions">';

    if (!isHistory) {
      actions += '<button type="button" class="btn-admin btn-admin-ghost btn-admin-sm btn-admin-with-icon event-edit-btn" data-event-id="' + id + '">'
        + icon('edit') + escapeHtml(labels.edit) + '</button>';
    }

    if (showPublishNow) {
      actions += '<form method="POST" action="/admin/' + slug + '/events/publish-now" class="event-action-form">'
        + '<input type="hidden" name="eventId" value="' + id + '">'
        + '<button type="submit" class="btn-admin btn-admin-accent btn-admin-sm btn-admin-with-icon">' + icon('publish') + escapeHtml(labels.publishNow) + '</button>'
        + '</form>';
    }

    if (showEndNow) {
      actions += '<form method="POST" action="/admin/' + slug + '/events/end-now" class="event-action-form">'
        + '<input type="hidden" name="eventId" value="' + id + '">'
        + '<button type="submit" class="btn-admin btn-admin-ghost btn-admin-sm btn-admin-with-icon">' + icon('end') + escapeHtml(labels.endNow) + '</button>'
        + '</form>';
    }

    actions += '<form method="POST" action="/admin/' + slug + '/events/delete" class="event-delete-form">'
      + '<input type="hidden" name="eventId" value="' + id + '">'
      + '<button type="submit" class="btn-admin btn-admin-danger btn-admin-sm btn-admin-with-icon">' + icon('delete') + escapeHtml(labels.delete) + '</button>'
      + '</form>';

    actions += '</div>';

    return ''
      + '<article class="event-card' + (isHistory ? ' event-card-history' : ' event-card-highlight') + '" data-event-id="' + id + '">'
      + '<div class="event-card-main">'
      + '<h3 class="event-card-title">' + escapeHtml(event.title) + '</h3>'
      + description
      + '<dl class="event-card-meta">'
      + '<div><dt>' + escapeHtml(labels.month) + '/' + escapeHtml(labels.day) + '</dt><dd>' + escapeHtml(formatEventDate(event.eventDate)) + '</dd></div>'
      + '<div><dt>' + escapeHtml(labels.eventStartAt) + '</dt><dd>' + escapeHtml(formatDateTime(event.startAt)) + '</dd></div>'
      + '<div><dt>' + escapeHtml(labels.eventEndAt) + '</dt><dd>' + escapeHtml(formatDateTime(event.endAt)) + '</dd></div>'
      + '</dl>'
      + '</div>'
      + actions
      + '</article>';
  }

  function renderSection(listEl, events, options) {
    if (!listEl) {
      return;
    }

    if (!events || events.length === 0) {
      listEl.innerHTML = '<div class="admin-empty-state"><p>' + escapeHtml(options.emptyLabel) + '</p></div>';
      return;
    }

    listEl.innerHTML = events.map(function (event) {
      eventsById[String(event._id)] = event;
      return renderEventCard(event, options);
    }).join('');
  }

  function renderAllEvents(categorized) {
    renderSection(
      document.getElementById('activeEventsList'),
      categorized.active,
      { emptyLabel: labels.noActiveEvents, showEndNow: true, showPublishNow: false, isHistory: false },
    );
    renderSection(
      document.getElementById('scheduledEventsList'),
      categorized.scheduled,
      { emptyLabel: labels.noScheduledEvents, showEndNow: false, showPublishNow: true, isHistory: false },
    );
    renderSection(
      document.getElementById('historyEventsList'),
      categorized.history,
      { emptyLabel: labels.noHistoryEvents, showEndNow: false, showPublishNow: false, isHistory: true },
    );

    var eventsData = document.getElementById('events-data');
    if (eventsData) {
      eventsData.textContent = JSON.stringify(categorized);
    }
  }

  async function readJson(response) {
    var contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('Unexpected server response');
    }
    return response.json();
  }

  function formBodyFromForm(form) {
    var params = new URLSearchParams();
    var formData = new FormData(form);

    formData.forEach(function (value, key) {
      if (typeof value === 'string') {
        params.append(key, value);
      }
    });

    if (form.id === 'addEventForm') {
      var publishNowInput = form.querySelector('input[name="publishNow"]');
      if (publishNowInput) {
        params.set('publishNow', publishNowInput.value);
      }
    }

    return params;
  }

  async function submitAjax(form, message) {
    showBusy(message);

    try {
      var response = await fetch(form.action, {
        method: 'POST',
        body: formBodyFromForm(form),
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        credentials: 'same-origin',
      });

      var payload = await readJson(response);
      if (!response.ok || !payload.ok) {
        throw new Error((payload && payload.error) || 'Request failed');
      }

      renderAllEvents(payload.events);

      if (form.id === 'addEventForm') {
        form.reset();
        updateEventsPreview();
        scrollToActiveEvents();
        showStatus(labels.eventSaved || labels.saved || 'Saved', 'success');
      } else if (form.classList && form.classList.contains('event-delete-form')) {
        showStatus(labels.eventDeleted || labels.saved || 'Saved', 'success');
      } else {
        showStatus(labels.eventSaved || labels.saved || 'Saved', 'success');
      }

      if (form.id === 'editEventForm' && window.jQuery) {
        window.jQuery('#editEventModal').modal('hide');
      }

      if (busyText) {
        busyText.textContent = labels.saved || 'Saved';
      }

      window.setTimeout(hideBusy, 400);
    } catch (err) {
      hideBusy();
      showStatus(err.message || labels.eventSaveFailed || 'Save failed', 'error');
    }
  }

  function openEditModal(eventId) {
    var event = eventsById[String(eventId)];
    if (!event) {
      return;
    }

    document.getElementById('editEventId').value = eventId;
    var titles = event.titles || {};
    var texts = event.texts || {};
    document.getElementById('editEventTitleRu').value = titles.ru || event.title || '';
    document.getElementById('editEventTitleEn').value = titles.en || event.title || '';
    var editTitleHe = document.getElementById('editEventTitleHe');
    if (editTitleHe) editTitleHe.value = titles.he || '';
    document.getElementById('editEventTextRu').value = texts.ru || event.text || '';
    document.getElementById('editEventTextEn').value = texts.en || event.text || '';
    var editTextHe = document.getElementById('editEventTextHe');
    if (editTextHe) editTextHe.value = texts.he || '';
    document.getElementById('editEventMonth').value = event.eventDate && event.eventDate.month ? event.eventDate.month : '';
    document.getElementById('editEventDay').value = event.eventDate && event.eventDate.date ? event.eventDate.date : '';
    document.getElementById('editEventYear').value = event.eventDate && event.eventDate.year ? event.eventDate.year : '';
    document.getElementById('editEventStartAt').value = toDatetimeLocalValue(event.startAt);
    document.getElementById('editEventEndAt').value = toDatetimeLocalValue(event.endAt);

    if (window.jQuery) {
      window.jQuery('#editEventModal').modal('show');
    }
  }

  document.querySelectorAll('#addEventForm, #editEventForm').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();

      if (form.id === 'addEventForm') {
        var submitter = event.submitter;
        var publishNow = submitter && submitter.getAttribute('data-publish-now') === '1';
        var existing = form.querySelector('input[name="publishNow"]');
        if (existing) {
          existing.remove();
        }

        var input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'publishNow';
        input.value = publishNow ? '1' : '0';
        form.appendChild(input);
      }

      if (form.id === 'addEventForm') {
        var titleRu = document.getElementById('eventTitleRu');
        var titleEn = document.getElementById('eventTitleEn');
        var hasTitle = (titleRu && titleRu.value.trim()) || (titleEn && titleEn.value.trim());
        if (!hasTitle) {
          showStatus(labels.eventTitleRequired || 'Enter a title in Russian or English.', 'error');
          return;
        }
      }

      submitAjax(form, labels.saving || 'Saving…');
    });
  });

  var addEventForm = document.getElementById('addEventForm');
  if (addEventForm) {
    addEventForm.addEventListener('click', function (event) {
      var button = event.target.closest('button[type="submit"][data-publish-now]');
      if (!button) {
        return;
      }

      var existing = addEventForm.querySelector('input[name="publishNow"]');
      if (existing) {
        existing.remove();
      }

      var input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'publishNow';
      input.value = button.getAttribute('data-publish-now');
      addEventForm.appendChild(input);
    });
  }

  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!form.classList
      || (!form.classList.contains('event-delete-form')
        && !form.classList.contains('event-action-form'))) {
      return;
    }

    event.preventDefault();
    if (!window.confirm(labels.areYouSure || 'Are you sure?')) {
      return;
    }

    submitAjax(form, labels.saving || 'Saving…');
  });

  document.addEventListener('click', function (event) {
    var editBtn = event.target.closest('.event-edit-btn');
    if (editBtn) {
      openEditModal(editBtn.getAttribute('data-event-id'));
    }
  });

  async function translateText(text, target, source) {
    var slug = window.location.pathname.split('/')[2];
    var response = await fetch('/admin/' + slug + '/translate', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({ text: text, target: target, source: source || 'auto' }),
    });
    var payload = await response.json().catch(function () { return null; });
    if (!response.ok || !payload || !payload.ok || !payload.translated) {
      throw new Error((payload && payload.error) || 'Translate failed');
    }
    return payload.translated;
  }

  function detectSourceLang(text) {
    if (/[\u0590-\u05FF]/.test(text)) return 'he';
    if (/[\u0400-\u04FF]/.test(text)) return 'ru';
    return 'en';
  }

  async function autoTranslateScope(scope) {
    var map = scope === 'edit'
      ? {
          title: { ru: 'editEventTitleRu', en: 'editEventTitleEn', he: 'editEventTitleHe' },
          text: { ru: 'editEventTextRu', en: 'editEventTextEn', he: 'editEventTextHe' },
        }
      : {
          title: { ru: 'eventTitleRu', en: 'eventTitleEn', he: 'eventTitleHe' },
          text: { ru: 'eventTextRu', en: 'eventTextEn', he: 'eventTextHe' },
        };
    var status = document.querySelector('[data-translate-status="' + scope + '"]');
    var button = document.querySelector('.auto-translate-btn[data-translate-scope="' + scope + '"]');

    function setStatus(message, isError) {
      if (!status) return;
      status.hidden = !message;
      status.textContent = message || '';
      status.style.color = isError ? '#c62828' : '';
    }

    var langs = ['ru', 'en', 'he'];
    var sourceLang = null;
    var sourceTitle = '';
    var sourceText = '';

    langs.forEach(function (lang) {
      var titleEl = document.getElementById(map.title[lang]);
      var textEl = document.getElementById(map.text[lang]);
      var titleVal = titleEl ? String(titleEl.value || '').trim() : '';
      var textVal = textEl ? String(textEl.value || '').trim() : '';
      if (!sourceTitle && titleVal) {
        sourceTitle = titleVal;
        sourceLang = lang;
      }
      if (!sourceText && textVal) {
        sourceText = textVal;
        if (!sourceLang) sourceLang = lang;
      }
    });

    if (!sourceTitle && !sourceText) {
      setStatus('אין טקסט לתרגום', true);
      return;
    }

    if (!sourceLang) {
      sourceLang = detectSourceLang(sourceTitle || sourceText);
    }

    if (button) button.disabled = true;
    setStatus('מתרגם…', false);

    try {
      for (var i = 0; i < langs.length; i += 1) {
        var target = langs[i];
        if (target === sourceLang) continue;

        var titleTarget = document.getElementById(map.title[target]);
        var textTarget = document.getElementById(map.text[target]);

        if (titleTarget && sourceTitle && !String(titleTarget.value || '').trim()) {
          titleTarget.value = await translateText(sourceTitle, target, sourceLang);
          titleTarget.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (textTarget && sourceText && !String(textTarget.value || '').trim()) {
          textTarget.value = await translateText(sourceText, target, sourceLang);
          textTarget.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      setStatus('התרגום הושלם', false);
      window.setTimeout(function () { setStatus('', false); }, 2500);
    } catch (err) {
      setStatus(err.message || 'שגיאת תרגום / Translate failed', true);
    } finally {
      if (button) button.disabled = false;
    }
  }

  document.addEventListener('click', function (event) {
    var btn = event.target.closest('.auto-translate-btn');
    if (!btn) return;
    event.preventDefault();
    autoTranslateScope(btn.getAttribute('data-translate-scope') || 'add');
  });

  try {
    bindEventsPreview();
    var initial = JSON.parse(document.getElementById('events-data').textContent);
    renderAllEvents(initial);
  } catch (e) {
    bindEventsPreview();
  }
})();
