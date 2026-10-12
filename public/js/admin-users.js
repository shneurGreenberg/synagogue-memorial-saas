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

  function bindSessionThemeToggle() {
    var toggle = document.getElementById('sessionColorModeToggle');
    var hidden = document.getElementById('sessionColorModeInput');
    var label = document.getElementById('sessionColorModeToggleLabel');
    var field = document.querySelector('.users-session-theme-field');
    var body = document.body;
    if (!toggle || !hidden || !label || !field) {
      return;
    }

    var lightLabel = field.dataset.lightLabel || 'Light';
    var darkLabel = field.dataset.darkLabel || 'Dark';

    function applyAdminTheme(isLight) {
      body.classList.remove('admin-theme-light', 'admin-theme-dark');
      body.classList.add(isLight ? 'admin-theme-light' : 'admin-theme-dark');
      hidden.value = isLight ? 'light' : 'dark';
      label.textContent = isLight ? lightLabel : darkLabel;
    }

    toggle.addEventListener('change', function () {
      applyAdminTheme(toggle.checked);
    });
    applyAdminTheme(toggle.checked);
  }

  function bindSessionLanguagePreview() {
    var languageSelect = document.getElementById('sessionAdminLanguage');
    if (!languageSelect || !window.AdminLocale) {
      return;
    }

    languageSelect.addEventListener('change', function () {
      window.AdminLocale.apply(languageSelect.value);
    });
  }

  bindSessionThemeToggle();
  bindSessionLanguagePreview();

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
