(function ($) {
  function readData(button, key) {
    return button.getAttribute('data-' + key) || '';
  }

  function setChecked(id, value) {
    var input = document.getElementById(id);
    if (input) {
      input.checked = value === '1' || value === 'true' || value === true;
    }
  }

  function saveMyAdminPreferences() {
    var form = document.getElementById('myAdminPreferencesForm');
    if (!form) {
      return;
    }

    var formData = new FormData(form);
    fetch(form.action, {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json',
      },
      body: formData,
      credentials: 'same-origin',
    }).then(function (response) {
      if (!response.ok) {
        return null;
      }
      return response.json();
    }).then(function (payload) {
      if (!payload || !payload.ok) {
        return;
      }
      if (payload.colorMode === 'light' || payload.colorMode === 'dark') {
        var isLight = payload.colorMode === 'light';
        document.body.classList.toggle('admin-theme-light', isLight);
        document.body.classList.toggle('admin-theme-dark', !isLight);
        var hidden = document.getElementById('sessionColorModeInput');
        var toggle = document.getElementById('sessionColorModeToggle');
        if (hidden) {
          hidden.value = payload.colorMode;
        }
        if (toggle) {
          toggle.setAttribute('aria-pressed', isLight ? 'true' : 'false');
          toggle.dataset.mode = payload.colorMode;
        }
      }
    }).catch(function () {
      /* ignore network errors; user can retry by changing setting again */
    });
  }

  function bindSessionThemeToggle() {
    var toggle = document.getElementById('sessionColorModeToggle');
    var hidden = document.getElementById('sessionColorModeInput');
    var body = document.body;
    if (!toggle || !hidden) {
      return;
    }

    function applyAdminTheme(isLight) {
      body.classList.toggle('admin-theme-light', isLight);
      body.classList.toggle('admin-theme-dark', !isLight);
      hidden.value = isLight ? 'light' : 'dark';
      toggle.setAttribute('aria-pressed', isLight ? 'true' : 'false');
      toggle.dataset.mode = isLight ? 'light' : 'dark';
    }

    var initialLight = body.classList.contains('admin-theme-light');
    applyAdminTheme(initialLight);

    toggle.addEventListener('click', function () {
      var isLight = hidden.value !== 'light';
      applyAdminTheme(isLight);
      saveMyAdminPreferences();
    });
  }

  function bindSessionLanguagePreview() {
    var languageSelect = document.getElementById('sessionAdminLanguage');
    if (!languageSelect || !window.AdminLocale) {
      return;
    }

    languageSelect.addEventListener('change', function () {
      window.AdminLocale.apply(languageSelect.value);
      saveMyAdminPreferences();
    });
  }

  function bindPreferencesForm() {
    var form = document.getElementById('myAdminPreferencesForm');
    if (!form) {
      return;
    }
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      saveMyAdminPreferences();
    });
  }

  bindSessionThemeToggle();
  bindSessionLanguagePreview();
  bindPreferencesForm();

  $('#editUserModal').on('show.bs.modal', function (event) {
    var button = event.relatedTarget;
    if (!button) {
      return;
    }

    document.getElementById('editUserId').value = readData(button, 'user-id');
    document.getElementById('editUsername').value = readData(button, 'username');
    document.getElementById('editDisplayName').value = readData(button, 'display-name');
    document.getElementById('editAdminLanguage').value = readData(button, 'admin-language') || 'ru';
    document.getElementById('editColorMode').value = readData(button, 'color-mode') || 'dark';

    setChecked('editPermissionPeople', readData(button, 'perm-people'));
    setChecked('editPermissionPeopleImport', readData(button, 'perm-people-import'));
    setChecked('editPermissionContactDirectory', readData(button, 'perm-contact-directory'));
    setChecked('editPermissionEvents', readData(button, 'perm-events'));
    setChecked('editPermissionSettingsPreview', readData(button, 'perm-settings-preview'));
    setChecked('editPermissionSettingsAppearance', readData(button, 'perm-settings-appearance'));
    setChecked('editPermissionSettingsBranding', readData(button, 'perm-settings-branding'));
    setChecked('editPermissionSettingsFeatures', readData(button, 'perm-settings-features'));
    setChecked('editPermissionSettingsLanguages', readData(button, 'perm-settings-languages'));
    setChecked('editPermissionSettingsSavedViews', readData(button, 'perm-settings-saved-views'));
    setChecked('editPermissionSettingsAdminPanel', readData(button, 'perm-settings-admin-panel'));
  });
})(jQuery);
