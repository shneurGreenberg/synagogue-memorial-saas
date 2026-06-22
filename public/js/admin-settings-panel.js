(function () {
  function initCollapsiblePanels(root) {
    (root || document).querySelectorAll('.admin-panel-collapsible').forEach(function (panel) {
      var toggle = panel.querySelector('.admin-panel-toggle');
      var body = panel.querySelector('.admin-panel-body');
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

  function capturePreviewScreenshot() {
    var frame = document.getElementById('boardPreviewFrame');
    var doc = frame && frame.contentDocument;
    var root = doc && (doc.querySelector('.main-container') || doc.body);
    if (!root) {
      return Promise.resolve('');
    }

    return loadHtml2Canvas().then(function (html2canvas) {
      return html2canvas(root, {
        backgroundColor: null,
        scale: 0.45,
        useCORS: true,
        logging: false,
        width: root.scrollWidth,
        height: root.scrollHeight,
        windowWidth: root.scrollWidth,
        windowHeight: root.scrollHeight,
      });
    }).then(function (canvas) {
      var thumb = document.createElement('canvas');
      thumb.width = 480;
      thumb.height = 270;
      var ctx = thumb.getContext('2d');
      if (!ctx) {
        return '';
      }

      ctx.fillStyle = '#1a1410';
      ctx.fillRect(0, 0, thumb.width, thumb.height);
      ctx.drawImage(canvas, 0, 0, thumb.width, thumb.height);
      return thumb.toDataURL('image/jpeg', 0.86);
    }).catch(function () {
      return '';
    });
  }

  function updateActiveViewBadge(name) {
    var badge = document.getElementById('activeSavedViewBadge');
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
