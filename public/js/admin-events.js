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
      actions += '<button type="button" class="btn-admin btn-admin-ghost btn-admin-sm event-edit-btn" data-event-id="' + id + '">'
        + escapeHtml(labels.edit) + '</button>';
    }

    if (showPublishNow) {
      actions += '<form method="POST" action="/admin/' + slug + '/events/publish-now" class="event-action-form">'
        + '<input type="hidden" name="eventId" value="' + id + '">'
        + '<button type="submit" class="btn-admin btn-admin-accent btn-admin-sm">' + escapeHtml(labels.publishNow) + '</button>'
        + '</form>';
    }

    if (showEndNow) {
      actions += '<form method="POST" action="/admin/' + slug + '/events/end-now" class="event-action-form">'
        + '<input type="hidden" name="eventId" value="' + id + '">'
        + '<button type="submit" class="btn-admin btn-admin-ghost btn-admin-sm">' + escapeHtml(labels.endNow) + '</button>'
        + '</form>';
    }

    actions += '<form method="POST" action="/admin/' + slug + '/events/delete" class="event-delete-form">'
      + '<input type="hidden" name="eventId" value="' + id + '">'
      + '<button type="submit" class="btn-admin btn-admin-danger btn-admin-sm">' + escapeHtml(labels.delete) + '</button>'
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
      }

      if (form.id === 'editEventForm' && window.jQuery) {
        window.jQuery('#editEventModal').modal('hide');
      }

      if (busyText) {
        busyText.textContent = labels.saved || 'Saved';
      }

      window.setTimeout(hideBusy, 600);
    } catch (err) {
      hideBusy();
      window.alert(err.message || 'Save failed');
    }
  }

  function openEditModal(eventId) {
    var event = eventsById[String(eventId)];
    if (!event) {
      return;
    }

    document.getElementById('editEventId').value = eventId;
    document.getElementById('editEventTitle').value = event.title || '';
    document.getElementById('editEventText').value = event.text || '';
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

        var startAt = form.querySelector('[name="startAt"]');
        var eventMonth = form.querySelector('[name="eventMonth"]');
        var eventDay = form.querySelector('[name="eventDate"]');
        var hasEventDate = eventMonth && eventMonth.value && eventDay && eventDay.value;
        var hasStartAt = startAt && startAt.value;

        if (!publishNow && !hasStartAt && !hasEventDate) {
          window.alert(labels.eventStartRequired || labels.eventStartAt || 'Publish from date is required');
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

  try {
    var initial = JSON.parse(document.getElementById('events-data').textContent);
    renderAllEvents(initial);
  } catch (e) {
    /* ignore */
  }
})();
