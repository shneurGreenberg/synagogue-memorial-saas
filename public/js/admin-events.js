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

    var titleInput = document.getElementById('eventTitle');
    var textInput = document.getElementById('eventText');
    var monthInput = document.getElementById('eventMonth');
    var dayInput = document.getElementById('eventDay');
    var yearInput = document.getElementById('eventYear');

    var title = String((titleInput && titleInput.value) || '').trim();
    var text = String((textInput && textInput.value) || '').trim();

    var sectionTitleEl = document.getElementById('eventsPreviewSectionTitle');
    var titleEl = document.getElementById('eventsPreviewTitle');
    var textEl = document.getElementById('eventsPreviewText');
    var dateEl = document.getElementById('eventsPreviewDate');

    if (sectionTitleEl) {
      sectionTitleEl.textContent = labels.sectionTitle || '';
    }
    if (titleEl) {
      if (title) {
        titleEl.textContent = title;
        titleEl.classList.remove('is-placeholder');
      } else {
        titleEl.textContent = labels.titleSample || '';
        titleEl.classList.add('is-placeholder');
      }
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
      var hasDate = Boolean(monthInput && monthInput.value && dayInput && dayInput.value);
      dateEl.textContent = formatted || '';
      dateEl.hidden = !hasDate || !formatted;
    }
  }

  function bindEventsPreview() {
    document.querySelectorAll('.event-preview-input, #eventMonth, #eventDay, #eventYear').forEach(function (input) {
      input.addEventListener('input', updateEventsPreview);
      input.addEventListener('change', updateEventsPreview);
    });
    updateEventsPreview();
  }

  function readFormTitle(form) {
    if (!form) {
      return '';
    }
    var byId = form.id === 'addEventForm'
      ? document.getElementById('eventTitle')
      : document.getElementById('editEventTitle');
    if (byId && typeof byId.value === 'string') {
      return byId.value.trim();
    }
    var field = form.elements && (form.elements.namedItem('eventTitle') || form.elements.namedItem('title'));
    if (!field) {
      return '';
    }
    var value = field.value;
    if (typeof value === 'string') {
      return value.trim();
    }
    return '';
  }

  function mapEventSaveError(message) {
    if (!message) {
      return labels.eventSaveFailed || 'Save failed';
    }
    if (message === 'Title is required') {
      return labels.eventTitleRequired || message;
    }
    if (message === 'Schedule start is required') {
      return labels.eventStartRequired || message;
    }
    return message;
  }

  function icon(name, className) {
    if (window.AdminIcons && typeof window.AdminIcons.render === 'function') {
      return window.AdminIcons.render(name, className || 'btn-admin-inline-icon');
    }
    return '';
  }

  var statusTimer = null;

  function feedbackElForForm(form) {
    if (!form) {
      return null;
    }
    if (form.id === 'addEventForm') {
      return document.getElementById('addEventFormFeedback');
    }
    if (form.id === 'editEventForm') {
      return document.getElementById('editEventFormFeedback');
    }
    return null;
  }

  function showStatus(message, type, form) {
    var isError = type === 'error';
    var feedback = feedbackElForForm(form);
    if (feedback) {
      feedback.textContent = message;
      feedback.className = 'admin-form-feedback admin-form-feedback--' + (type || 'success');
      feedback.hidden = !message;
      if (message && typeof feedback.scrollIntoView === 'function') {
        feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    if (!isError && window.AdminFormFeedback && typeof window.AdminFormFeedback.showSuccess === 'function') {
      window.AdminFormFeedback.showSuccess(message);
    }

    if (statusTimer) {
      window.clearTimeout(statusTimer);
    }

    if (!isError && message) {
      statusTimer = window.setTimeout(function () {
        if (feedback) {
          feedback.hidden = true;
        }
      }, 5000);
    }
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
    var showReorder = options.showReorder;

    var description = event.text
      ? '<p class="event-card-text">' + escapeHtml(event.text) + '</p>'
      : '';

    var actions = '<div class="event-card-actions">';

    if (!isHistory) {
      actions += '<button type="button" class="btn-admin btn-admin-ghost btn-admin-sm btn-admin-with-icon event-edit-btn" data-event-id="' + id + '">'
        + icon('edit') + escapeHtml(labels.edit) + '</button>';
    }

    if (showReorder) {
      actions += '<button type="button" class="btn-admin btn-admin-ghost btn-admin-sm event-reorder-btn" data-event-id="' + id + '" data-direction="up" aria-label="' + escapeHtml(labels.moveUp) + '">&#9650;</button>';
      actions += '<button type="button" class="btn-admin btn-admin-ghost btn-admin-sm event-reorder-btn" data-event-id="' + id + '" data-direction="down" aria-label="' + escapeHtml(labels.moveDown) + '">&#9660;</button>';
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
      { emptyLabel: labels.noActiveEvents, showEndNow: true, showPublishNow: false, isHistory: false, showReorder: true },
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
        showStatus(labels.eventSaved || labels.saved || 'Saved', 'success', form);
      } else if (form.classList && form.classList.contains('event-delete-form')) {
        showStatus(labels.eventDeleted || labels.saved || 'Saved', 'success', form);
      } else {
        showStatus(labels.eventSaved || labels.saved || 'Saved', 'success', form);
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
      showStatus(mapEventSaveError(err.message), 'error', form);
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
    var adminTitle = String(event.title || '').trim()
      || String(titles.he || titles.ru || titles.en || '').trim();
    var adminText = String(event.text || '').trim()
      || String(texts.he || texts.ru || texts.en || '').trim();

    document.getElementById('editEventTitle').value = adminTitle;
    document.getElementById('editEventText').value = adminText;

    var hasTickerDate = Boolean(event.eventDate && event.eventDate.month && event.eventDate.date);

    document.getElementById('editEventMonth').value = hasTickerDate && event.eventDate.month ? event.eventDate.month : '';
    document.getElementById('editEventDay').value = hasTickerDate && event.eventDate.date ? event.eventDate.date : '';
    document.getElementById('editEventYear').value = hasTickerDate && event.eventDate.year ? event.eventDate.year : '';
    document.getElementById('editEventStartAt').value = toDatetimeLocalValue(event.startAt);
    document.getElementById('editEventEndAt').value = toDatetimeLocalValue(event.endAt);

    if (window.jQuery) {
      window.jQuery('#editEventModal').modal('show');
    }
  }

  function clearPartialEventDateFields(form) {
    var month = form.querySelector('[name="eventMonth"]');
    var day = form.querySelector('[name="eventDay"], [name="eventDate"]');
    var year = form.querySelector('[name="eventYear"]');
    var hasMonth = month && String(month.value || '').trim();
    var hasDay = day && String(day.value || '').trim();
    if ((hasMonth && !hasDay) || (!hasMonth && hasDay)) {
      if (month) month.value = '';
      if (day) day.value = '';
      if (year) year.value = '';
    }
  }

  document.querySelectorAll('#addEventForm, #editEventForm').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var publishNow = false;
      if (form.id === 'addEventForm') {
        var submitter = event.submitter;
        publishNow = submitter && submitter.getAttribute('data-publish-now') === '1';
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

      clearPartialEventDateFields(form);

      var titleValue = readFormTitle(form);
      if (!titleValue) {
        showStatus(labels.eventTitleRequired || 'Enter a title.', 'error', form);
        return;
      }

      if (form.id === 'addEventForm' && !publishNow) {
        var startAtField = form.querySelector('[name="startAt"]');
        if (!startAtField || !String(startAtField.value || '').trim()) {
          showStatus(labels.eventStartRequired || 'Choose a publish date or click Publish now.', 'error', form);
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
      return;
    }

    var reorderBtn = event.target.closest('.event-reorder-btn');
    if (!reorderBtn) {
      return;
    }

    event.preventDefault();
    var eventId = reorderBtn.getAttribute('data-event-id');
    var direction = reorderBtn.getAttribute('data-direction');
    showBusy(labels.saving || 'Saving…');

    fetch('/admin/' + slug + '/events/reorder', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: new URLSearchParams({
        eventId: eventId,
        direction: direction,
      }).toString(),
    }).then(readJson).then(function (result) {
      if (!result.ok) {
        throw new Error((result && result.error) || 'Reorder failed');
      }
      renderAllEvents(result.events);
      hideBusy();
      showStatus(labels.saved || 'Saved', 'success', null);
    }).catch(function (err) {
      hideBusy();
      showStatus(err.message || 'Reorder failed', 'error', null);
    });
  });

  try {
    bindEventsPreview();
    var initial = JSON.parse(document.getElementById('events-data').textContent);
    renderAllEvents(initial);
  } catch (e) {
    bindEventsPreview();
  }
})();
