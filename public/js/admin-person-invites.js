(function () {
  function copyWithFallback(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }

    return new Promise(function (resolve, reject) {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      var ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (err) {
        document.body.removeChild(textarea);
        reject(err);
        return;
      }

      document.body.removeChild(textarea);
      if (ok) {
        resolve();
      } else {
        reject(new Error('copy_failed'));
      }
    });
  }

  function initRow(row) {
    var input = row.querySelector('[data-invite-url]');
    var copyBtn = row.querySelector('.person-invite-copy');
    var whatsappLink = row.querySelector('.person-invite-whatsapp');
    if (!input) {
      return;
    }

    var url = String(input.value || '').trim();

    if (whatsappLink && url) {
      var message = whatsappLink.getAttribute('data-whatsapp-message') || url;
      var text = message.indexOf('http') >= 0 ? message.replace(/\{url\}/g, url) : (message + ' ' + url);
      whatsappLink.href = 'https://wa.me/?text=' + encodeURIComponent(text.trim());
    }

    if (!copyBtn) {
      return;
    }

    var originalLabel = copyBtn.textContent;
    var copiedLabel = copyBtn.getAttribute('data-copied-label') || 'Copied';
    var resetTimer;

    copyBtn.addEventListener('click', function () {
      if (!url) {
        input.focus();
        input.select();
        return;
      }

      function showCopied() {
        copyBtn.textContent = copiedLabel;
        clearTimeout(resetTimer);
        resetTimer = setTimeout(function () {
          copyBtn.textContent = originalLabel;
        }, 2000);
      }

      copyWithFallback(url)
        .then(showCopied)
        .catch(function () {
          input.focus();
          input.select();
        });
    });
  }

  function init() {
    var rows = document.querySelectorAll('.admin-person-invite-row');
    rows.forEach(initRow);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
