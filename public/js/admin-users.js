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
    setChecked('editPermissionSlideshow', readData(button, 'perm-slideshow'));
    setChecked('editPermissionEvents', readData(button, 'perm-events'));
    setChecked('editPermissionSettingsPreview', readData(button, 'perm-settings-preview'));
    setChecked('editPermissionSettingsAppearance', readData(button, 'perm-settings-appearance'));
    setChecked('editPermissionSettingsBranding', readData(button, 'perm-settings-branding'));
    setChecked('editPermissionSettingsFeatures', readData(button, 'perm-settings-features'));
    setChecked('editPermissionSettingsLanguages', readData(button, 'perm-settings-languages'));
    setChecked('editPermissionSettingsAdminPanel', readData(button, 'perm-settings-admin-panel'));
  });
})(jQuery);
