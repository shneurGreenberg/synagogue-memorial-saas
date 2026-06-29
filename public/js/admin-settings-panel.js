(function () {
  function initCollapsiblePanels(root) {
    (root || document).querySelectorAll('.admin-panel-collapsible').forEach(function (panel) {
      var toggle = panel.querySelector('.admin-panel-toggle');
      var body = panel.querySelector(':scope > .admin-panel-body');
      if (!toggle || !body) {
        return;
      }

      var expanded = panel.classList.contains('is-expanded');
      toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      body.hidden = !expanded;

      toggle.addEventListener('click', function () {
        var nextExpanded = body.hidden;
        body.hidden = !nextExpanded;
        toggle.setAttribute('aria-expanded', nextExpanded ? 'true' : 'false');
        panel.classList.toggle('is-expanded', nextExpanded);
        panel.classList.toggle('is-collapsed', !nextExpanded);
      });
    });
  }

  function loadHtml2Canvas() {
    if (window.html2canvas) {
      return Promise.resolve(window.html2canvas);
    }

    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      script.async = true;
      script.onload = function () {
        resolve(window.html2canvas);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function waitForImages(root) {
    var images = Array.prototype.slice.call(root.querySelectorAll('img'));
    var pending = images.filter(function (img) {
      return !img.complete;
    });

    if (!pending.length) {
      return Promise.resolve();
    }

    return Promise.all(pending.map(function (img) {
      return new Promise(function (resolve) {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    }));
  }

  function capturePreviewScreenshot() {
    var frame = document.getElementById('boardPreviewFrame');
    var doc = frame && frame.contentDocument;
    var root = doc && (doc.querySelector('.main-container') || doc.querySelector('.wooden-panel'));
    if (!root) {
      return Promise.resolve('');
    }

    var BOARD_W = 1920;
    var BOARD_H = 1080;
    var TARGET_W = 480;
    var TARGET_H = 270;

    return waitForImages(root).then(function () {
      return loadHtml2Canvas();
    }).then(function (html2canvas) {
      return html2canvas(root, {
        backgroundColor: '#2a2118',
        scale: TARGET_W / BOARD_W,
        width: BOARD_W,
        height: BOARD_H,
        windowWidth: BOARD_W,
        windowHeight: BOARD_H,
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 15000,
      });
    }).then(function (canvas) {
      var thumb = document.createElement('canvas');
      thumb.width = TARGET_W;
      thumb.height = TARGET_H;
      var ctx = thumb.getContext('2d');
      if (!ctx) {
        return '';
      }

      ctx.fillStyle = '#2a2118';
      ctx.fillRect(0, 0, thumb.width, thumb.height);

      var sourceW = canvas.width;
      var sourceH = canvas.height;
      var sourceRatio = sourceW / sourceH;
      var targetRatio = TARGET_W / TARGET_H;
      var drawW;
      var drawH;
      var offsetX = 0;
      var offsetY = 0;

      if (sourceRatio > targetRatio) {
        drawH = TARGET_H;
        drawW = Math.round(TARGET_H * sourceRatio);
        offsetX = Math.round((TARGET_W - drawW) / 2);
      } else {
        drawW = TARGET_W;
        drawH = Math.round(TARGET_W / sourceRatio);
        offsetY = Math.round((TARGET_H - drawH) / 2);
      }

      ctx.drawImage(canvas, 0, 0, sourceW, sourceH, offsetX, offsetY, drawW, drawH);
      return thumb.toDataURL('image/jpeg', 0.9);
    }).catch(function () {
      return '';
    });
  }

  function updateActiveViewBadge(name) {
    ['activeSavedViewBadge', 'boardPreviewViewBadge'].forEach(function (id) {
      var badge = document.getElementById(id);
      if (!badge) {
        return;
      }

      if (name) {
        badge.textContent = name;
        badge.hidden = false;
      } else {
        badge.textContent = '';
        badge.hidden = true;
      }
    });
  }

  function setInputValue(id, value) {
    var el = document.getElementById(id);
    if (!el || value === undefined || value === null) {
      return;
    }
    el.value = value;
  }

  function setCheckboxValue(id, checked) {
    var el = document.getElementById(id);
    if (!el) {
      return;
    }
    el.checked = !!checked;
  }

  function setColorPair(colorId, hexId, value) {
    setInputValue(colorId, value);
    setInputValue(hexId, value);
  }

  function applySnapshotToSettingsForm(snapshot) {
    if (!snapshot) {
      return;
    }

    var theme = snapshot.theme || {};
    var titles = snapshot.titles || {};
    var memorialQr = snapshot.memorialQrPanel || {};

    setInputValue('titleRu', titles.ru || '');
    setInputValue('titleEn', titles.en || '');
    setInputValue('titleHe', titles.he || '');
    setColorPair('primaryColor', 'primaryColorHex', theme.primaryColor);
    setColorPair('textColor', 'textColorHex', theme.textColor);
    setColorPair('accentColor', 'accentColorHex', theme.accentColor);
    setColorPair('tileColor', 'tileColorHex', theme.tileColor);

    if (theme.tileOpacity != null) {
      setInputValue('tileOpacity', theme.tileOpacity);
      var tileOpacityValue = document.getElementById('tileOpacityValue');
      if (tileOpacityValue) {
        tileOpacityValue.textContent = theme.tileOpacity + '%';
      }
    }

    if (theme.candlePalette) {
      setInputValue('candlePalette', theme.candlePalette);
    }

    if (theme.logoBorderRadius != null) {
      setInputValue('logoBorderRadius', theme.logoBorderRadius);
      var logoBorderRadiusValue = document.getElementById('logoBorderRadiusValue');
      if (logoBorderRadiusValue) {
        logoBorderRadiusValue.textContent = theme.logoBorderRadius + '%';
      }
      var preview = document.getElementById('communityLogoPreview');
      if (preview) {
        preview.style.setProperty('--preview-logo-radius', String(theme.logoBorderRadius));
      }
    }

    if (snapshot.language) {
      setInputValue('language', snapshot.language);
    }

    var fontScales = theme.fontScales || {};
    Object.keys(fontScales).forEach(function (key) {
      var input = document.querySelector('.font-scale-input[data-font-scale-key="' + key + '"]');
      if (!input) {
        return;
      }
      input.value = fontScales[key];
      var output = document.querySelector('.font-scale-value[data-for="' + input.id + '"]');
      if (output) {
        output.textContent = fontScales[key] + '%';
      }
    });

    [
      ['memorialQrTitleScale', memorialQr.titleScale],
      ['memorialQrTextScale', memorialQr.textScale],
      ['memorialQrQrScale', memorialQr.qrScale],
    ].forEach(function (pair) {
      if (pair[1] == null) {
        return;
      }
      setInputValue(pair[0], pair[1]);
      var output = document.getElementById(pair[0] + 'Value');
      if (output) {
        output.textContent = pair[1] + '%';
      }
    });

    var boardFeatures = snapshot.boardFeatures || {};
    Object.keys(boardFeatures).forEach(function (key) {
      setCheckboxValue('feature_' + key, boardFeatures[key]);
    });
    setCheckboxValue('shabbatTimesEnabled', snapshot.shabbatTimesEnabled);

    var publicSubmission = snapshot.publicSubmission || {};
    setCheckboxValue('publicSubmissionEnabled', publicSubmission.enabled);
    if (publicSubmission.donationUrl != null) {
      setInputValue('publicSubmissionDonationUrl', publicSubmission.donationUrl);
    }
  }

  function parseJsonResponse(response) {
    return response.text().then(function (text) {
      if (!text) {
        return {};
      }
      try {
        return JSON.parse(text);
      } catch (err) {
        return { ok: false, error: text };
      }
    }).then(function (data) {
      return { ok: response.ok, data: data };
    });
  }

  function initSavedViewsGrid(options) {
    options = options || {};
    var grid = document.getElementById('savedViewsGrid');
    if (!grid || grid.dataset.savedViewsBound === '1') {
      return;
    }

    grid.dataset.savedViewsBound = '1';
    var slug = options.slug || grid.dataset.slug || '';
    var deleteConfirm = options.deleteConfirm || grid.dataset.deleteConfirm || 'Delete this saved view?';
    var emptyText = options.emptyText || grid.dataset.emptyText || '';

    grid.addEventListener('click', function (event) {
      var applyBtn = event.target.closest('.saved-view-apply-btn');
      var deleteBtn = event.target.closest('.saved-view-delete-btn');
      if (!applyBtn && !deleteBtn) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      var card = event.target.closest('.saved-view-card');
      if (!card || !card.dataset.viewId) {
        return;
      }

      var viewId = card.dataset.viewId;

      if (applyBtn) {
        applyBtn.disabled = true;
        card.classList.add('is-applying');
        var viewNameEl = card.querySelector('.saved-view-meta h3, .saved-view-thumb-label');
        fetch('/admin/' + slug + '/settings/saved-views/' + encodeURIComponent(viewId) + '/apply', {
          method: 'POST',
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
        }).then(parseJsonResponse).then(function (result) {
          if (result.ok && result.data && result.data.ok) {
            var viewName = (result.data.viewName || (viewNameEl ? viewNameEl.textContent : '')).trim();
            if (typeof options.onApply === 'function') {
              options.onApply(viewId, viewName);
            }
            if (result.data.snapshot) {
              applySnapshotToSettingsForm(result.data.snapshot);
              if (typeof options.onSnapshotApplied === 'function') {
                options.onSnapshotApplied(result.data.snapshot);
              }
            }
            card.classList.add('is-applied');
            window.setTimeout(function () {
              card.classList.remove('is-applied');
            }, 1200);
            return;
          }
          window.alert(options.applyError || 'Could not apply saved view.');
        }).catch(function () {
          window.alert(options.applyError || 'Could not apply saved view.');
        }).finally(function () {
          applyBtn.disabled = false;
          card.classList.remove('is-applying');
        });
        return;
      }

      if (deleteBtn) {
        if (!window.confirm(deleteConfirm)) {
          return;
        }

        deleteBtn.disabled = true;
        card.classList.add('is-deleting');
        fetch('/admin/' + slug + '/settings/saved-views/' + encodeURIComponent(viewId), {
          method: 'DELETE',
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
        }).then(parseJsonResponse).then(function (result) {
          if (result.ok && result.data && result.data.ok) {
            card.remove();
            if (typeof options.onDelete === 'function') {
              options.onDelete(viewId);
            }
            if (!grid.querySelector('.saved-view-card')) {
              var empty = document.createElement('p');
              empty.className = 'saved-views-empty';
              empty.id = 'savedViewsEmpty';
              empty.textContent = emptyText;
              grid.appendChild(empty);
            }
            return;
          }
          window.alert(options.deleteError || 'Could not delete saved view.');
        }).catch(function () {
          window.alert(options.deleteError || 'Could not delete saved view.');
        }).finally(function () {
          deleteBtn.disabled = false;
          if (card.parentNode) {
            card.classList.remove('is-deleting');
          }
        });
      }
    });
  }

  function initLogoBorderRadiusPreview() {
    var input = document.getElementById('logoBorderRadius');
    if (!input || input.dataset.bound === '1') {
      return;
    }

    input.dataset.bound = '1';
    var output = document.getElementById('logoBorderRadiusValue');
    var preview = document.getElementById('communityLogoPreview');

    function applyRadius() {
      var value = input.value;
      if (output) {
        output.textContent = value + '%';
      }
      if (preview) {
        preview.style.setProperty('--preview-logo-radius', value);
      }
    }

    input.addEventListener('input', applyRadius);
    applyRadius();
  }

  window.AdminSettingsPanel = {
    initCollapsiblePanels: initCollapsiblePanels,
    capturePreviewScreenshot: capturePreviewScreenshot,
    updateActiveViewBadge: updateActiveViewBadge,
    applySnapshotToSettingsForm: applySnapshotToSettingsForm,
    initSavedViewsGrid: initSavedViewsGrid,
    initLogoBorderRadiusPreview: initLogoBorderRadiusPreview,
  };

  function initSettingsPageUi() {
    initCollapsiblePanels(document.querySelector('.settings-page'));
    initLogoBorderRadiusPreview();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSettingsPageUi);
  } else {
    initSettingsPageUi();
  }
})();
