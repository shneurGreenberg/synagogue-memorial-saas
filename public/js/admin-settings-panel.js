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

  function capturePreviewScreenshot() {
    return Promise.resolve('');
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
