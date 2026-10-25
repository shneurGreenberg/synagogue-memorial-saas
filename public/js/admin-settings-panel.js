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

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = function () {
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function loadHtml2Canvas() {
    if (window.html2canvas) {
      return Promise.resolve(window.html2canvas);
    }

    return loadScript('/js/vendor/html2canvas.min.js').then(function () {
      if (window.html2canvas) {
        return window.html2canvas;
      }
      return loadScript('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js').then(function () {
        return window.html2canvas;
      });
    });
  }

  function waitForPreviewFrameReady(frame, timeoutMs) {
    var deadline = Date.now() + (timeoutMs || 8000);
    return new Promise(function (resolve) {
      function check() {
        if (!frame) {
          resolve(false);
          return;
        }
        if (frame.dataset.previewReady === '1' && frame.contentDocument) {
          resolve(true);
          return;
        }
        if (Date.now() >= deadline) {
          resolve(false);
          return;
        }
        window.setTimeout(check, 80);
      }
      check();
    });
  }

  function delay(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
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

  var PREVIEW_MAX_WIDTH = 800;

  function canvasToPreviewDataUrl(canvas) {
    if (!canvas) {
      return '';
    }

    var out = canvas;
    if (canvas.width > PREVIEW_MAX_WIDTH) {
      out = document.createElement('canvas');
      out.width = PREVIEW_MAX_WIDTH;
      out.height = Math.max(1, Math.round(canvas.height * (PREVIEW_MAX_WIDTH / canvas.width)));
      var resizeCtx = out.getContext('2d');
      if (!resizeCtx) {
        return '';
      }
      resizeCtx.drawImage(canvas, 0, 0, out.width, out.height);
    }

    var webp = out.toDataURL('image/webp', 0.82);
    if (webp.indexOf('data:image/webp') === 0) {
      return webp;
    }

    return out.toDataURL('image/jpeg', 0.85);
  }

  /**
   * Pixel-faithful capture of the live preview board (F6, 1.28.0).
   * modern-screenshot renders the iframe DOM through the browser's own engine
   * (SVG foreignObject), so fonts, RTL text, textures and candles look exactly
   * like the preview. html2canvas (which re-draws the DOM itself) is only a fallback.
   */
  function loadModernScreenshotInto(win) {
    if (win.modernScreenshot) {
      return Promise.resolve(win.modernScreenshot);
    }
    return new Promise(function (resolve, reject) {
      var doc = win.document;
      var script = doc.createElement('script');
      script.src = '/js/vendor/modern-screenshot.min.js';
      script.onload = function () {
        if (win.modernScreenshot) {
          resolve(win.modernScreenshot);
        } else {
          reject(new Error('modern-screenshot missing'));
        }
      };
      script.onerror = reject;
      (doc.head || doc.documentElement).appendChild(script);
    });
  }

  function captureWithModernScreenshot(frame) {
    var win = frame.contentWindow;
    var doc = frame.contentDocument;
    if (!win || !doc || !doc.body) {
      return Promise.resolve('');
    }
    var viewW = Math.max(win.innerWidth || 0, 960);
    var viewH = Math.max(win.innerHeight || 0, 540);
    var scale = Math.min(1, PREVIEW_MAX_WIDTH / viewW);
    var fontsReady = doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();

    return Promise.all([fontsReady, waitForImages(doc.body)]).then(function () {
      return loadModernScreenshotInto(win);
    }).then(function (ms) {
      var bg = win.getComputedStyle(doc.body).backgroundColor;
      return ms.domToCanvas(doc.documentElement, {
        width: viewW,
        height: viewH,
        scale: scale,
        backgroundColor: bg && bg !== 'rgba(0, 0, 0, 0)' ? bg : '#2a2118',
        timeout: 15000,
        style: { overflow: 'hidden' },
      });
    }).then(canvasToPreviewDataUrl);
  }

  function captureWithHtml2Canvas(frame) {
    var doc = frame.contentDocument;
    var root = doc && (doc.querySelector('.main-container') || doc.querySelector('.wooden-panel'));
    if (!root) {
      return Promise.resolve('');
    }

    var boardW = Math.max(root.scrollWidth || 0, root.clientWidth || 0, 960);
    var boardH = Math.max(root.scrollHeight || 0, root.clientHeight || 0, 540);
    var scale = Math.min(1, PREVIEW_MAX_WIDTH / boardW);

    return waitForImages(root).then(function () {
      return loadHtml2Canvas();
    }).then(function (html2canvas) {
      return html2canvas(root, {
        backgroundColor: '#2a2118',
        scale: scale,
        width: boardW,
        height: boardH,
        windowWidth: boardW,
        windowHeight: boardH,
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 15000,
      });
    }).then(canvasToPreviewDataUrl);
  }

  function capturePreviewScreenshot() {
    var frame = document.getElementById('boardPreviewFrame');
    if (!frame) {
      return Promise.resolve('');
    }

    return waitForPreviewFrameReady(frame).then(function () {
      return delay(300);
    }).then(function () {
      return captureWithModernScreenshot(frame).catch(function () {
        return '';
      });
    }).then(function (dataUrl) {
      return dataUrl || captureWithHtml2Canvas(frame);
    }).catch(function () {
      return '';
    });
  }

  function uploadSavedViewPreview(slug, viewId, imageDataUrl) {
    if (!slug || !viewId || !imageDataUrl) {
      return Promise.resolve({ ok: false });
    }

    return fetch('/admin/' + slug + '/settings/saved-views/' + encodeURIComponent(viewId) + '/preview-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({ imageDataUrl: imageDataUrl }),
    }).then(parseJsonResponse).then(function (result) {
      if (result.ok && result.data && result.data.ok) {
        return { ok: true, view: result.data.view, screenshot: result.data.screenshot };
      }
      return { ok: false };
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

    if (snapshot.titles) {
      if (titles.ru != null) {
        setInputValue('titleRu', titles.ru);
      }
      if (titles.en != null) {
        setInputValue('titleEn', titles.en);
      }
      if (titles.he != null) {
        setInputValue('titleHe', titles.he);
      }
    }
    setColorPair('primaryColor', 'primaryColorHex', theme.primaryColor);
    setColorPair('textColor', 'textColorHex', theme.textColor);
    setColorPair('accentColor', 'accentColorHex', theme.accentColor);
    setColorPair('tileColor', 'tileColorHex', theme.tileColor);
    setColorPair('panelBorderColor', 'panelBorderColorHex', theme.panelBorderColor);
    setColorPair('tileBorderColor', 'tileBorderColorHex', theme.tileBorderColor);

    if (theme.tileOpacity != null) {
      setInputValue('tileOpacity', theme.tileOpacity);
    }
    if (theme.panelBorderOpacity != null) {
      setInputValue('panelBorderOpacity', theme.panelBorderOpacity);
    }
    if (theme.tileBorderOpacity != null) {
      setInputValue('tileBorderOpacity', theme.tileBorderOpacity);
    }

    if (theme.candlePalette) {
      setInputValue('candlePalette', theme.candlePalette);
    }

    if (theme.boardFont) {
      setInputValue('boardFont', theme.boardFont);
    }

    if (Object.prototype.hasOwnProperty.call(snapshot, 'language') && snapshot.language) {
      setInputValue('language', snapshot.language);
    }

    var fontScales = theme.fontScales || {};
    Object.keys(fontScales).forEach(function (key) {
      var input = document.querySelector('.font-scale-input[data-font-scale-key="' + key + '"]');
      if (!input) {
        return;
      }
      input.value = fontScales[key];
    });

    if (memorialQr.titles || memorialQr.texts || memorialQr.donationTitles || memorialQr.donationTexts) {
      var memorialQrTitleFields = memorialQr.titles || {};
      var memorialQrTextFields = memorialQr.texts || {};
      var donationQrTitleFields = memorialQr.donationTitles || {};
      var donationQrTextFields = memorialQr.donationTexts || {};
      [
        ['memorialQrTitleRu', memorialQrTitleFields.ru],
        ['memorialQrTitleEn', memorialQrTitleFields.en],
        ['memorialQrTitleHe', memorialQrTitleFields.he],
        ['memorialQrTextRu', memorialQrTextFields.ru],
        ['memorialQrTextEn', memorialQrTextFields.en],
        ['memorialQrTextHe', memorialQrTextFields.he],
        ['donationQrTitleRu', donationQrTitleFields.ru],
        ['donationQrTitleEn', donationQrTitleFields.en],
        ['donationQrTitleHe', donationQrTitleFields.he],
        ['donationQrTextRu', donationQrTextFields.ru],
        ['donationQrTextEn', donationQrTextFields.en],
        ['donationQrTextHe', donationQrTextFields.he],
      ].forEach(function (pair) {
        if (pair[1] != null) {
          setInputValue(pair[0], pair[1]);
        }
      });
    }

    [
      ['memorialQrTitleScale', memorialQr.titleScale],
      ['memorialQrTextScale', memorialQr.textScale],
      ['memorialQrQrScale', memorialQr.qrScale],
    ].forEach(function (pair) {
      if (pair[1] == null) {
        return;
      }
      setInputValue(pair[0], pair[1]);
    });

    if (snapshot.boardFeatures) {
      var boardFeatures = snapshot.boardFeatures || {};
      Object.keys(boardFeatures).forEach(function (key) {
        setCheckboxValue('feature_' + key, boardFeatures[key]);
      });
    }
    if (Object.prototype.hasOwnProperty.call(snapshot, 'shabbatTimesEnabled')) {
      setCheckboxValue('shabbatTimesEnabled', snapshot.shabbatTimesEnabled);
    }

    if (snapshot.publicSubmission) {
      var publicSubmission = snapshot.publicSubmission || {};
      setCheckboxValue('publicSubmissionEnabled', publicSubmission.enabled);
      setCheckboxValue('publicSubmissionShowDonationQr', publicSubmission.showDonationQr !== false);
      setCheckboxValue('publicSubmissionShowRegistrationQr', publicSubmission.showRegistrationQr !== false);
      if (publicSubmission.donationUrl != null) {
        setInputValue('publicSubmissionDonationUrl', publicSubmission.donationUrl);
      }
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

    function downloadSavedViewExport(viewId) {
      var url = '/admin/' + slug + '/settings/saved-views/' + encodeURIComponent(viewId) + '/export';
      var link = document.createElement('a');
      link.href = url;
      link.rel = 'noopener';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    grid.addEventListener('click', function (event) {
      var applyBtn = event.target.closest('.saved-view-apply-btn');
      var exportBtn = event.target.closest('.saved-view-export-btn');
      var deleteBtn = event.target.closest('.saved-view-delete-btn');
      if (!applyBtn && !exportBtn && !deleteBtn) {
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

      if (exportBtn) {
        downloadSavedViewExport(viewId);
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

  function initSavedViewImport(options) {
    options = options || {};
    var importBtn = document.getElementById('importSavedViewBtn');
    var importFile = document.getElementById('importSavedViewFile');
    if (!importBtn || !importFile || importBtn.dataset.importBound === '1') {
      return;
    }

    importBtn.dataset.importBound = '1';
    var slug = options.slug || '';

    importBtn.addEventListener('click', function () {
      importFile.value = '';
      importFile.click();
    });

    importFile.addEventListener('change', function () {
      var file = importFile.files && importFile.files[0];
      if (!file) {
        return;
      }

      file.text().then(function (text) {
        var parsed;
        try {
          parsed = JSON.parse(text);
        } catch (err) {
          throw new Error('invalid json');
        }

        return fetch('/admin/' + slug + '/settings/saved-views/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: JSON.stringify({ export: parsed }),
        }).then(parseJsonResponse).then(function (result) {
          if (result.ok && result.data && result.data.ok && result.data.view) {
            if (typeof options.onImport === 'function') {
              options.onImport(result.data.view);
            }
            window.alert(options.importSuccess || 'Saved view imported');
            return;
          }
          throw new Error((result.data && result.data.error) || 'import failed');
        });
      }).catch(function () {
        window.alert(options.importError || 'Could not import saved view.');
      });
    });
  }

  window.AdminSettingsPanel = {
    initCollapsiblePanels: initCollapsiblePanels,
    capturePreviewScreenshot: capturePreviewScreenshot,
    uploadSavedViewPreview: uploadSavedViewPreview,
    updateActiveViewBadge: updateActiveViewBadge,
    applySnapshotToSettingsForm: applySnapshotToSettingsForm,
    initSavedViewsGrid: initSavedViewsGrid,
    initSavedViewImport: initSavedViewImport,
  };

  function initSettingsPageUi() {
    initCollapsiblePanels(document.querySelector('.settings-page'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSettingsPageUi);
  } else {
    initSettingsPageUi();
  }
})();
