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

  function selectInputText(input) {
    if (!input) {
      return;
    }
    input.focus();
    input.select();
    if (typeof input.setSelectionRange === 'function') {
      input.setSelectionRange(0, input.value.length);
    }
  }

  function init() {
    var btn = document.getElementById('copyOnboardingLinkBtn');
    var input = document.getElementById('onboardingInviteUrl');
    if (!btn || !input) {
      return;
    }

    var originalLabel = btn.textContent;
    var copiedLabel = btn.getAttribute('data-copied-label') || 'הועתק ✓';
    var resetTimer;

    btn.addEventListener('click', function () {
      var text = String(input.value || '');
      if (!text) {
        selectInputText(input);
        return;
      }

      function showCopied() {
        btn.textContent = copiedLabel;
        clearTimeout(resetTimer);
        resetTimer = setTimeout(function () {
          btn.textContent = originalLabel;
        }, 2000);
      }

      copyWithFallback(text)
        .then(showCopied)
        .catch(function () {
          selectInputText(input);
          try {
            if (document.execCommand('copy')) {
              showCopied();
            }
          } catch (err) {
            selectInputText(input);
          }
        });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
