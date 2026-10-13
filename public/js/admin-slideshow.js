(function () {
  var overlay = document.getElementById('adminBusyOverlay');
  var busyText = document.getElementById('adminBusyText');
  var labels = window.slideshowAdminLabels || {};
  var config = window.slideshowAdminConfig || {};

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

  function updatePreview(slideshow) {
    var preview = document.getElementById('slideshowCurrentPreview');
    if (!preview) {
      return;
    }

    var slide = slideshow && (slideshow.currentSlide || (slideshow.images && slideshow.images[slideshow.images.length - 1]));
    if (!slide || !slide.url) {
      preview.innerHTML = '<span class="media-preview-empty">' + escapeHtml(labels.noSlides || '') + '</span>';
      return;
    }

    preview.innerHTML = '<img src="/images/' + escapeHtml(slide.url) + '" alt="">';
  }

  function syncRotateFieldsVisibility(form) {
    var rotateFields = document.getElementById('slideshowRotateFields');
    if (!rotateFields || !form) {
      return;
    }

    var mode = form.querySelector('input[name="slideshowMode"]:checked')
      || form.querySelector('input[name="displayMode"]:checked');
    var modeValue = mode && mode.value;
    var isRotate = modeValue === 'rotate';
    rotateFields.hidden = !isRotate;
  }

  async function readJson(response) {
    var contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('Unexpected server response');
    }
    return response.json();
  }

  async function submitSettings(form) {
    showBusy(labels.saving || 'Saving...');

    try {
      var response = await fetch(form.action, {
        method: 'POST',
        body: new URLSearchParams(new FormData(form)),
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

      updatePreview(payload.slideshow);
      syncRotateFieldsVisibility(form);

      if (busyText) {
        busyText.textContent = labels.saved || 'Saved';
      }
      window.setTimeout(hideBusy, 600);
    } catch (err) {
      hideBusy();
      window.alert(err.message || 'Save failed');
    }
  }

  async function uploadSlide(file, input) {
    var uploadUrl = config.uploadUrl || (input && input.getAttribute('data-upload-url'));
    if (!uploadUrl || !file) {
      return;
    }

    showBusy(labels.saving || 'Saving...');
    var formData = new FormData();
    formData.append('image', file);

    try {
      var response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          Accept: 'application/json',
        },
        credentials: 'same-origin',
      });

      var payload = await readJson(response);
      if (!response.ok || !payload.ok) {
        throw new Error((payload && payload.error) || labels.uploadFailed || 'Upload failed');
      }

      updatePreview(payload.slideshow);
      if (busyText) {
        busyText.textContent = labels.saved || 'Saved';
      }
      window.setTimeout(hideBusy, 600);
    } catch (err) {
      hideBusy();
      window.alert(err.message || labels.uploadFailed || 'Upload failed');
      if (input) {
        input.value = '';
      }
    }
  }

  var panelForm = document.querySelector('.slideshow-panel-form');
  if (panelForm) {
    panelForm.addEventListener('submit', function (event) {
      event.preventDefault();
      submitSettings(panelForm);
    });

    panelForm.addEventListener('change', function (event) {
      if (event.target && (event.target.name === 'slideshowMode' || event.target.name === 'displayMode')) {
        syncRotateFieldsVisibility(panelForm);
      }
    });

    syncRotateFieldsVisibility(panelForm);
  }

  var imageInput = document.getElementById('slideshowImageInput');
  if (imageInput) {
    imageInput.addEventListener('change', function () {
      var file = imageInput.files && imageInput.files[0];
      if (!file) {
        return;
      }

      var preview = document.getElementById('slideshowCurrentPreview');
      if (preview) {
        var reader = new FileReader();
        reader.onload = function (e) {
          preview.innerHTML = '<img src="' + e.target.result + '" alt="">';
        };
        reader.readAsDataURL(file);
      }

      uploadSlide(file, imageInput);
    });
  }
})();
