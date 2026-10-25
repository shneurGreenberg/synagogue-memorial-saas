(function () {
  var form = document.getElementById('publicAddNameForm') || document.querySelector('.public-form');
  if (!form) {
    return;
  }

  var dial = form.querySelector('[name="contactPhoneDial"]');
  var national = form.querySelector('[name="contactPhoneNational"]');
  var hidden = form.querySelector('[name="contactPhone"]');
  if (!dial || !national || !hidden) {
    return;
  }

  function digits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function syncPhone() {
    var code = String(dial.value || '').trim();
    var local = digits(national.value);
    hidden.value = code && local ? code + local : '';
  }

  // 1.28.0 F2: the closed picker shows only the dial code ("+7"); country
  // abbreviations stay visible in the opened list.
  var display = dial.parentNode && dial.parentNode.querySelector('.public-phone-dial-display');
  function syncDialDisplay() {
    if (!display) {
      return;
    }
    display.textContent = String(dial.value || '').trim();
  }
  if (display) {
    dial.classList.add('has-code-display');
    dial.addEventListener('change', syncDialDisplay);
    syncDialDisplay();
  }

  dial.addEventListener('change', syncPhone);
  national.addEventListener('input', syncPhone);
  form.addEventListener('submit', syncPhone);
  syncPhone();
})();
