(function () {
  var overlay = document.getElementById('adminBusyOverlay');
  var busyText = document.getElementById('adminBusyText');

  function showBusy(message) {
    if (!overlay) {
      return;
    }
    if (busyText && message) {
      busyText.textContent = message;
    }
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
  }

  function hideBusy() {
    if (!overlay) {
      return;
    }
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderSlides(slideshow, labels) {
    var grid = document.querySelector('.slides-grid');
    if (!grid || !slideshow) {
      return;
    }

    var images = slideshow.images || [];
    if (images.length === 0) {
      grid.innerHTML = '<div class="admin-empty-state slides-grid-empty"><p>' + escapeHtml(labels.noSlides) + '</p></div>';
      return;
    }

    var slug = window.location.pathname.split('/')[2];
    var html = '';

    images.forEach(function (slide) {
      var id = String(slide._id);
      var caption = slide.text
        ? '<p class="slide-caption">' + escapeHtml(slide.text) + '</p>'
        : '<p class="slide-caption slide-caption-muted">' + escapeHtml(labels.captionOptional) + '</p>';

      html += ''
        + '<article class="slide-card slide-card-clickable" role="button" tabindex="0" data-slide-id="' + id + '">'
        + '<div class="slide-card-image"><img src="/images/' + escapeHtml(slide.url) + '" alt=""></div>'
        + '<div class="slide-card-body">'
        + caption
        + '<span class="slide-edit-hint">' + escapeHtml(labels.edit) + '</span>'
        + '<form method="POST" action="/admin/' + slug + '/slideshow/delete" class="slide-delete-form">'
        + '<input type="hidden" name="slideId" value="' + id + '">'
        + '<button type="submit" class="btn-admin btn-admin-danger btn-admin-sm">' + escapeHtml(labels.delete) + '</button>'
        + '</form>'
        + '</div></article>';
    });

    grid.innerHTML = html;
    window.dispatchEvent(new CustomEvent('slideshow-grid-updated'));
  }

  async function submitAjax(form, message) {
    showBusy(message);
    var formData = new FormData(form);

    try {
      var response = await fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'same-origin',
      });

      var payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error((payload && payload.error) || 'Request failed');
      }

      var labels = window.slideshowAdminLabels || {};
      renderSlides(payload.slideshow, labels);

      var slidesData = document.getElementById('slides-data');
      if (slidesData) {
        slidesData.textContent = JSON.stringify(payload.slideshow.images || []);
      }

      if (form.classList.contains('add-slide-form')) {
        form.reset();
        var preview = document.getElementById('slidePreview');
        if (preview) {
          preview.innerHTML = '<span class="media-preview-empty">' + escapeHtml(labels.uploadPhoto || '') + '</span>';
        }
      }

      if (form.id === 'editSlideForm' && window.jQuery) {
        window.jQuery('#editSlideModal').modal('hide');
      }

      if (busyText) {
        busyText.textContent = labels.saved || 'Saved';
      }

      window.setTimeout(hideBusy, 500);
    } catch (err) {
      hideBusy();
      window.alert(err.message || 'Save failed');
    }
  }

  document.querySelectorAll('.slideshow-settings-form, .add-slide-form, #editSlideForm').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var labels = window.slideshowAdminLabels || {};
      submitAjax(form, labels.saving || 'Saving…');
    });
  });

  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!form.classList || !form.classList.contains('slide-delete-form')) {
      return;
    }

    event.preventDefault();
    if (!window.confirm((window.slideshowAdminLabels || {}).areYouSure || 'Are you sure?')) {
      return;
    }

    submitAjax(form, (window.slideshowAdminLabels || {}).saving || 'Saving…');
  });
})();
