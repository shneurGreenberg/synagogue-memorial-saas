(function () {
  function digitsOnly(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function maskDigits(digits) {
    const d = digitsOnly(digits).slice(0, 8);
    if (d.length <= 2) {
      return d;
    }
    if (d.length <= 4) {
      return d.slice(0, 2) + '.' + d.slice(2);
    }
    return d.slice(0, 2) + '.' + d.slice(2, 4) + '.' + d.slice(4);
  }

  function bindInput(input) {
    if (!input || input.dataset.deathDateBound === '1') {
      return;
    }
    input.dataset.deathDateBound = '1';
    input.setAttribute('inputmode', 'numeric');
    input.setAttribute('autocomplete', 'off');
    input.addEventListener('input', function () {
      const masked = maskDigits(input.value);
      if (input.value !== masked) {
        input.value = masked;
      }
    });
    input.addEventListener('blur', function () {
      const masked = maskDigits(input.value);
      input.value = masked;
    });
  }

  function bindAll(root) {
    (root || document).querySelectorAll('.public-death-date-input').forEach(bindInput);
  }

  bindAll(document);

  window.PublicDeathDateInput = {
    bindAll,
    bindInput,
  };
})();
