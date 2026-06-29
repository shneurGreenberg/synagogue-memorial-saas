(function () {
  var activeSuggestionList = null;
  var activeSuggestionRow = null;
  var searchTimer = null;

  function getSlug() {
    var page = document.querySelector('.people-page');
    return page ? page.getAttribute('data-synagogue-slug') || '' : '';
  }

  function getDirectoryCount() {
    var page = document.querySelector('.people-page');
    return Number(page && page.getAttribute('data-contact-directory-count')) || 0;
  }

  function setDirectoryCount(count) {
    var page = document.querySelector('.people-page');
    if (page) {
      page.setAttribute('data-contact-directory-count', String(count));
    }

    var el = document.getElementById('contactDirectoryCount');
    if (!el) {
      return;
    }

    if (!count) {
      el.hidden = true;
      el.textContent = '';
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
        window.location.href = '/admin/' + encodeURIComponent(slug) + '/people?contactsImported=1';
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
      refreshCountLabel();
      initImportForm();
      document.querySelectorAll('.admin-contact-row').forEach(attachAutocompleteToRow);
    },
  };
})();
