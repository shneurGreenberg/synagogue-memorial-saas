(function () {
  var form = document.getElementById('adminPreferencesForm');
  if (!form) {
    return;
  }

  var langSelect = document.getElementById('navbarAdminLanguage');
  var colorSelect = document.getElementById('navbarColorMode');

  function applyPreferences() {
    if (window.AdminLocale && langSelect) {
      window.AdminLocale.apply(langSelect.value);
    }

    if (colorSelect) {
      document.body.classList.remove('admin-theme-dark', 'admin-theme-light');
      document.body.classList.add(colorSelect.value === 'light' ? 'admin-theme-light' : 'admin-theme-dark');
    }
  }

  if (langSelect) {
    langSelect.addEventListener('change', applyPreferences);
  }

  if (colorSelect) {
    colorSelect.addEventListener('change', applyPreferences);
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
    }

    fetch(form.action, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: new URLSearchParams(new FormData(form)).toString(),
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        if (data && data.ok) {
          applyPreferences();
          if (submitButton) {
            submitButton.textContent = submitButton.dataset.savedLabel || 'Saved';
            setTimeout(function () {
              submitButton.disabled = false;
              submitButton.textContent = submitButton.dataset.saveLabel || 'Save';
            }, 1200);
          }
        }
      })
      .catch(function () {
        form.submit();
      });
  });
})();
