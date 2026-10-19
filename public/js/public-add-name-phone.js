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

  dial.addEventListener('change', syncPhone);
  national.addEventListener('input', syncPhone);
  form.addEventListener('submit', syncPhone);
  syncPhone();
})();
