(function () {
  var activeSuggestionList = null;
  var activeSuggestionRow = null;
  var searchTimer = null;
  var manageSearchTimer = null;
  var manageContactsCache = [];

  function getPage() {
    return document.querySelector('.contacts-page') || document.querySelector('.people-page');
  }

  function isContactsPage() {
    return !!document.querySelector('.contacts-page');
  }

  function isPeoplePage() {
    return !!document.querySelector('.people-page');
  }

  function getSlug() {
    var page = getPage();
    return page ? page.getAttribute('data-synagogue-slug') || '' : '';
  }

  function getPageMessage(key) {
    var page = getPage();
    return page ? page.getAttribute(key) || '' : '';
  }

  function getDirectoryCount() {
    var page = getPage();
    return Number(page && page.getAttribute('data-contact-directory-count')) || 0;
  }

  function setDirectoryCount(count) {
    var page = getPage();
    if (page) {
      page.setAttribute('data-contact-directory-count', String(count));
    }

    var el = document.getElementById('contactDirectoryCount');
    if (!el) {
      return;
    }

    if (!count) {
      if (isContactsPage()) {
        el.hidden = false;
        var emptyTemplate = (page && page.getAttribute('data-contact-directory-count-label')) || '{{count}}';
        el.textContent = emptyTemplate.replace(/\{\{count\}\}/g, '0');
      } else {
        el.hidden = true;
        el.textContent = '';
      }
      return;
    }

    var template = (page && page.getAttribute('data-contact-directory-count-label')) || '{{count}}';
    el.hidden = false;
    el.textContent = template.replace(/\{\{count\}\}/g, String(count));
  }

  function refreshCountLabel() {
    setDirectoryCount(getDirectoryCount());
  }

  function hideSuggestions(list) {
    if (!list) {
      return;
    }

    list.hidden = true;
    list.innerHTML = '';
  }

  function closeActiveSuggestions() {
    if (activeSuggestionList) {
      hideSuggestions(activeSuggestionList);
    }
    activeSuggestionList = null;
    activeSuggestionRow = null;
  }

  function fillContactFromDirectory(row, entry) {
    if (!row || !entry) {
      return;
    }

    var nameInput = row.querySelector('[data-field="name"]');
    var phoneInput = row.querySelector('[data-field="phone"]');
    var emailInput = row.querySelector('[data-field="email"]');

    if (nameInput) {
      nameInput.value = entry.name || '';
    }
    if (phoneInput && entry.phone) {
      phoneInput.value = entry.phone;
    }
    if (emailInput && entry.email) {
      emailInput.value = entry.email;
    }
  }

  function renderSuggestions(list, row, results) {
    list.innerHTML = '';

    if (!results.length) {
      list.hidden = true;
      return;
    }

    results.forEach(function (entry) {
      var item = document.createElement('li');
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'admin-contact-suggestion-btn';
      var label = document.createElement('span');
      label.textContent = entry.name || entry.phone || entry.email || '';
      button.appendChild(label);
      if (entry.phone) {
        var meta = document.createElement('span');
        meta.className = 'admin-contact-suggestion-meta';
        meta.textContent = entry.phone;
        button.appendChild(meta);
      }
      button.addEventListener('mousedown', function (event) {
        event.preventDefault();
        fillContactFromDirectory(row, entry);
        hideSuggestions(list);
      });
      item.appendChild(button);
      list.appendChild(item);
    });

    list.hidden = false;
    activeSuggestionList = list;
    activeSuggestionRow = row;
  }

  function fetchSuggestions(query) {
    var slug = getSlug();
    if (!slug || !query || query.length < 2) {
      return Promise.resolve([]);
    }

    var params = new URLSearchParams({ q: query });
    return fetch('/admin/' + encodeURIComponent(slug) + '/contacts/search?' + params.toString(), {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    }).then(function (response) {
      return response.json();
    }).then(function (data) {
      return data && data.ok && Array.isArray(data.results) ? data.results : [];
    }).catch(function () {
      return [];
    });
  }

  function attachAutocompleteToRow(row) {
    if (!row || row.dataset.directoryAutocompleteBound === '1') {
      return;
    }

    if (!getDirectoryCount()) {
      return;
    }

    var nameInput = row.querySelector('[data-field="name"]');
    var list = row.querySelector('[data-contact-suggestions]');
    if (!nameInput || !list) {
      return;
    }

    row.dataset.directoryAutocompleteBound = '1';
    nameInput.setAttribute('autocomplete', 'off');

    nameInput.addEventListener('input', function () {
      clearTimeout(searchTimer);
      var query = nameInput.value.trim();
      if (query.length < 2) {
        hideSuggestions(list);
        return;
      }

      searchTimer = window.setTimeout(function () {
        fetchSuggestions(query).then(function (results) {
          if (document.activeElement !== nameInput) {
            return;
          }
          renderSuggestions(list, row, results);
        });
      }, 180);
    });

    nameInput.addEventListener('blur', function () {
      window.setTimeout(function () {
        hideSuggestions(list);
      }, 150);
    });

    nameInput.addEventListener('focus', function () {
      var query = nameInput.value.trim();
      if (query.length < 2) {
        return;
      }

      fetchSuggestions(query).then(function (results) {
        renderSuggestions(list, row, results);
      });
    });
  }

  function fetchDirectoryContacts(query) {
    var slug = getSlug();
    if (!slug) {
      return Promise.resolve([]);
    }

    var params = new URLSearchParams();
    if (query) {
      params.set('q', query);
    }

    return fetch('/admin/' + encodeURIComponent(slug) + '/contacts?' + params.toString(), {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    }).then(function (response) {
      return response.json();
    }).then(function (data) {
      if (!data || !data.ok || !Array.isArray(data.contacts)) {
        return [];
      }
      if (typeof data.total === 'number') {
        setDirectoryCount(data.total);
      } else {
        setDirectoryCount(data.contacts.length);
      }
      manageContactsCache = data.contacts;
      return data.contacts;
    }).catch(function () {
      return [];
    });
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function contactInitials(name) {
    return String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (part) { return part[0]; })
      .join('')
      .toUpperCase() || '?';
  }

  function renderManageContactsList(contacts) {
    var listEl = document.getElementById('manageContactsList');
    var emptyEl = document.getElementById('manageContactsEmpty');
    if (!listEl) {
      return;
    }

    listEl.innerHTML = '';

    if (!contacts.length) {
      if (emptyEl) {
        emptyEl.hidden = false;
      }
      return;
    }

    if (emptyEl) {
      emptyEl.hidden = true;
    }

    contacts.forEach(function (contact) {
      var row = document.createElement('article');
      row.className = 'contact-row contact-row-clickable';
      row.dataset.contactId = contact.id || '';

      var phone = contact.phone || '';
      var email = contact.email || '';
      var metaParts = [phone, email].filter(Boolean);
      var metaText = metaParts.length ? metaParts.join(' · ') : '—';

      row.innerHTML = ''
        + '<span class="contact-avatar" aria-hidden="true">' + escapeHtml(contactInitials(contact.name)) + '</span>'
        + '<div class="contact-meta">'
        + '<strong>' + escapeHtml(contact.name || '—') + '</strong>'
        + '<small>' + escapeHtml(metaText) + '</small>'
        + '</div>'
        + '<div class="contact-actions">'
        + '<button type="button" class="btn-admin btn-admin-ghost btn-admin-sm manage-contact-edit-btn" data-contact-id="' + escapeHtml(contact.id) + '">' + escapeHtml(getPageMessage('data-edit-label') || 'Edit') + '</button>'
        + '<button type="button" class="btn-admin btn-admin-danger btn-admin-sm manage-contact-delete-btn" data-contact-id="' + escapeHtml(contact.id) + '" aria-label="Delete">×</button>'
        + '</div>';

      listEl.appendChild(row);
    });
  }

  function setManageContactModalTitle(isEdit) {
    var titleEl = document.getElementById('manageContactModalTitle');
    if (!titleEl) {
      return;
    }

    titleEl.textContent = isEdit
      ? (getPageMessage('data-edit-contact-title') || 'Edit contact')
      : (getPageMessage('data-add-contact-title') || 'Add contact');
  }

  function showManageContactForm(contact) {
    var modal = document.getElementById('manageContactModal');
    var form = document.getElementById('manageContactForm');
    var idInput = document.getElementById('manageContactId');
    var nameInput = document.getElementById('manageContactName');
    var phoneInput = document.getElementById('manageContactPhone');
    var emailInput = document.getElementById('manageContactEmail');
    if (!form || !idInput || !nameInput || !phoneInput || !emailInput) {
      return;
    }

    var source = contact || {};
    idInput.value = source.id || '';
    nameInput.value = source.name || '';
    phoneInput.value = source.phone || '';
    emailInput.value = source.email || '';
    setManageContactModalTitle(!!source.id);

    if (window.jQuery && modal) {
      window.jQuery(modal).modal('show');
    }

    nameInput.focus();
  }

  function hideManageContactForm() {
    var modal = document.getElementById('manageContactModal');
    var form = document.getElementById('manageContactForm');
    if (form) {
      form.reset();
    }

    var idInput = document.getElementById('manageContactId');
    if (idInput) {
      idInput.value = '';
    }

    if (window.jQuery && modal) {
      window.jQuery(modal).modal('hide');
    }
  }

  function loadManageContacts() {
    var searchInput = document.getElementById('manageContactsSearch');
    var query = searchInput ? searchInput.value.trim() : '';
    return fetchDirectoryContacts(query).then(renderManageContactsList);
  }

  function initContactsPage() {
    var searchInput = document.getElementById('manageContactsSearch');
    var addBtn = document.getElementById('manageContactsAddBtn');
    var form = document.getElementById('manageContactForm');
    var listEl = document.getElementById('manageContactsList');
    var page = document.querySelector('.contacts-page');

    if (!page || page.dataset.bound === '1') {
      return;
    }

    page.dataset.bound = '1';

    if (searchInput) {
      searchInput.addEventListener('input', function () {
        clearTimeout(manageSearchTimer);
        manageSearchTimer = window.setTimeout(loadManageContacts, 180);
      });
    }

    if (addBtn) {
      addBtn.addEventListener('click', function () {
        showManageContactForm({});
      });
    }

    if (listEl) {
      listEl.addEventListener('click', function (event) {
        var editBtn = event.target.closest('.manage-contact-edit-btn');
        var deleteBtn = event.target.closest('.manage-contact-delete-btn');
        var row = event.target.closest('.contact-row-clickable');
        var slug = getSlug();

        if (editBtn || (row && !deleteBtn)) {
          var contactId = (editBtn || row).getAttribute('data-contact-id') || '';
          var cached = manageContactsCache.find(function (entry) {
            return entry.id === contactId;
          });
          if (cached) {
            showManageContactForm(cached);
            return;
          }

          if (!row) {
            return;
          }

          var meta = row.querySelector('.contact-meta');
          var nameEl = meta ? meta.querySelector('strong') : null;
          var smallEl = meta ? meta.querySelector('small') : null;
          var parts = smallEl && smallEl.textContent !== '—'
            ? smallEl.textContent.split('·').map(function (part) { return part.trim(); })
            : [];
          showManageContactForm({
            id: contactId,
            name: nameEl ? nameEl.textContent : '',
            phone: parts[0] || '',
            email: parts[1] || '',
          });
          return;
        }

        if (!deleteBtn || !slug) {
          return;
        }

        if (!window.confirm(getPageMessage('data-manage-contacts-delete-confirm') || 'Delete this contact?')) {
          return;
        }

        var contactId = deleteBtn.getAttribute('data-contact-id');
        fetch('/admin/' + encodeURIComponent(slug) + '/contacts/' + encodeURIComponent(contactId), {
          method: 'DELETE',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            Accept: 'application/json',
          },
          credentials: 'same-origin',
        }).then(function (response) {
          return response.json().then(function (data) {
            return { ok: response.ok, data: data };
          });
        }).then(function (result) {
          if (!result.ok || !result.data || !result.data.ok) {
            throw new Error((result.data && result.data.error) || 'Delete failed');
          }
          setDirectoryCount(result.data.total || 0);
          return loadManageContacts();
        }).catch(function (err) {
          window.alert(err.message || 'Delete failed');
        });
      });
    }

    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var slug = getSlug();
        if (!slug) {
          return;
        }

        var idInput = document.getElementById('manageContactId');
        var payload = {
          name: (document.getElementById('manageContactName') || {}).value || '',
          phone: (document.getElementById('manageContactPhone') || {}).value || '',
          email: (document.getElementById('manageContactEmail') || {}).value || '',
        };
        var contactId = idInput ? idInput.value : '';
        var url = '/admin/' + encodeURIComponent(slug) + '/contacts';
        var method = 'POST';

        if (contactId) {
          url += '/' + encodeURIComponent(contactId);
          method = 'PUT';
        }

        fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            Accept: 'application/json',
          },
          credentials: 'same-origin',
          body: JSON.stringify(payload),
        }).then(function (response) {
          return response.json().then(function (data) {
            return { ok: response.ok, data: data };
          });
        }).then(function (result) {
          if (!result.ok || !result.data || !result.data.ok) {
            throw new Error((result.data && result.data.error) || 'Save failed');
          }
          setDirectoryCount(result.data.total || 0);
          hideManageContactForm();
          return loadManageContacts();
        }).catch(function (err) {
          window.alert(err.message || 'Save failed');
        });
      });
    }
  }

  function initImportForm() {
    var form = document.getElementById('importContactsForm');
    var fileInput = document.getElementById('importContactsFile');
    var submitBtn = document.getElementById('importContactsSubmit');
    if (!form || form.dataset.bound === '1') {
      return;
    }

    form.dataset.bound = '1';
    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var slug = getSlug();
      if (!slug || !fileInput || !fileInput.files || !fileInput.files[0]) {
        return;
      }

      var formData = new FormData();
      formData.append('file', fileInput.files[0]);

      if (submitBtn) {
        submitBtn.disabled = true;
      }

      fetch('/admin/' + encodeURIComponent(slug) + '/contacts/import', {
        method: 'POST',
        body: formData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          Accept: 'application/json',
        },
        credentials: 'same-origin',
      }).then(function (response) {
        return response.json().then(function (data) {
          return { ok: response.ok, data: data };
        });
      }).then(function (result) {
        if (!result.ok || !result.data || !result.data.ok) {
          throw new Error((result.data && result.data.error) || 'Import failed');
        }

        setDirectoryCount(result.data.total || 0);
        form.reset();
        if (window.jQuery) {
          window.jQuery('#importContactsModal').modal('hide');
        }
        window.location.href = '/admin/' + encodeURIComponent(slug) + '/contact-directory?contactsImported=1';
      }).catch(function (err) {
        window.alert(err.message || 'Import failed');
      }).finally(function () {
        if (submitBtn) {
          submitBtn.disabled = false;
        }
      });
    });
  }

  document.addEventListener('click', function (event) {
    if (!event.target.closest('[data-contact-name-field]')) {
      closeActiveSuggestions();
    }
  });

  window.AdminContactDirectory = {
    attachToRow: attachAutocompleteToRow,
    init: function () {
      if (isPeoplePage()) {
        document.querySelectorAll('.admin-contact-row').forEach(attachAutocompleteToRow);
      }

      if (isContactsPage()) {
        refreshCountLabel();
        initImportForm();
        initContactsPage();
        hideManageContactForm();
        loadManageContacts();
      }
    },
  };

  function autoInitContactDirectory() {
    if (isContactsPage()) {
      window.AdminContactDirectory.init();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInitContactDirectory);
  } else {
    autoInitContactDirectory();
  }
})();
