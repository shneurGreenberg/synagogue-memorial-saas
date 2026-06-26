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

  window.AdminSettingsPanel = {
    initCollapsiblePanels: initCollapsiblePanels,
    capturePreviewScreenshot: capturePreviewScreenshot,
    updateActiveViewBadge: updateActiveViewBadge,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initCollapsiblePanels(document.querySelector('.settings-page'));
    });
  } else {
    initCollapsiblePanels(document.querySelector('.settings-page'));
  }
})();
