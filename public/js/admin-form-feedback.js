(function () {
  function isRelocatableAlert(node) {
    if (!node || !node.classList) {
      return false;
    }
    if (node.classList.contains('undated-people-banner')
      || node.classList.contains('code-release-banner')
      || node.classList.contains('upcoming-holiday-notice')) {
      return false;
    }
    return node.classList.contains('alert-danger')
      || node.classList.contains('alert-success')
      || (node.classList.contains('admin-alert') && node.classList.contains('alert'));
  }

  function findActionsAnchor(page) {
    return page.querySelector('.form-actions-sticky')
      || page.querySelector('.event-form-actions')
      || page.querySelector('.users-session-preferences-form')
      || page.querySelector('form.admin-panel-form button[type="submit"]');
  }

  function relocateTopFormAlerts() {
    var page = document.querySelector('.admin-page');
    if (!page) {
      return;
    }

    var anchor = findActionsAnchor(page);
    if (!anchor) {
      return;
    }

    var host = anchor.closest('.form-actions-sticky, .event-form-actions, .users-session-preferences-form')
      || anchor.parentElement;
    if (!host) {
      return;
    }

    var alerts = Array.prototype.slice.call(page.children).filter(isRelocatableAlert);
    alerts.forEach(function (alert) {
      var slot = document.createElement('div');
      slot.className = 'admin-form-feedback admin-form-feedback--page admin-form-feedback--' + (
        alert.classList.contains('alert-danger') ? 'error' : 'success'
      );
      slot.setAttribute('role', 'alert');
      while (alert.firstChild) {
        slot.appendChild(alert.firstChild);
      }
      alert.remove();
      host.insertBefore(slot, host.firstChild);
      if (typeof slot.scrollIntoView === 'function') {
        slot.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  window.AdminFormFeedback = {
    relocateTopFormAlerts: relocateTopFormAlerts,
    showSuccess: function showSuccess(message) {
      if (!message) {
        return;
      }
      var page = document.querySelector('.admin-page');
      var anchor = page && findActionsAnchor(page);
      var host = anchor && (anchor.closest('.form-actions-sticky, .event-form-actions') || anchor.parentElement);
      if (!host) {
        return;
      }
      var slot = host.querySelector('.admin-form-feedback--transient');
      if (!slot) {
        slot = document.createElement('div');
        slot.className = 'admin-form-feedback admin-form-feedback--transient admin-form-feedback--success';
        slot.setAttribute('role', 'status');
        host.insertBefore(slot, host.firstChild);
      }
      slot.textContent = message;
      slot.hidden = false;
      window.setTimeout(function () {
        slot.hidden = true;
      }, 5000);
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', relocateTopFormAlerts);
  } else {
    relocateTopFormAlerts();
  }
})();
