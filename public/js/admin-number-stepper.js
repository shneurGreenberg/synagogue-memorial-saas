(function () {
  function parseNum(value, fallback) {
    var n = parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function stepDecimals(step) {
    var parts = String(step).split('.');
    return parts.length > 1 ? parts[1].length : 0;
  }

  function clampValue(input, rawValue) {
    var min = parseNum(input.getAttribute('min'), -Infinity);
    var max = parseNum(input.getAttribute('max'), Infinity);
    var step = parseNum(input.getAttribute('step'), 1);
    var value = Math.min(max, Math.max(min, rawValue));

    if (step > 0 && Number.isFinite(min)) {
      var stepsFromMin = Math.round((value - min) / step);
      value = min + stepsFromMin * step;
      value = Math.min(max, Math.max(min, value));
    }

    var decimals = stepDecimals(step);
    if (decimals > 0) {
      value = parseFloat(value.toFixed(decimals));
    }

    return value;
  }

  function setInputValue(input, rawValue, fireEvents) {
    var next = clampValue(input, rawValue);
    var changed = String(input.value) !== String(next);
    input.value = next;

    if (fireEvents && changed) {
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (fireEvents && !changed) {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function bindStepper(wrap) {
    if (wrap.dataset.stepperBound === '1') {
      return;
    }
    wrap.dataset.stepperBound = '1';

    var input = wrap.querySelector('.admin-number-stepper-input');
    if (!input) {
      return;
    }

    var step = parseNum(input.getAttribute('step'), 1);

    wrap.querySelectorAll('[data-admin-stepper-delta]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var delta = parseNum(btn.getAttribute('data-admin-stepper-delta'), 0);
        var current = parseNum(input.value, parseNum(input.getAttribute('min'), 0));
        setInputValue(input, current + delta * step, true);
      });
    });

    input.addEventListener('change', function () {
      setInputValue(input, parseNum(input.value, parseNum(input.getAttribute('min'), 0)), false);
    });

    input.addEventListener('blur', function () {
      setInputValue(input, parseNum(input.value, parseNum(input.getAttribute('min'), 0)), true);
    });
  }

  function initAdminNumberSteppers(root) {
    (root || document).querySelectorAll('.admin-number-stepper').forEach(bindStepper);
  }

  window.AdminNumberStepper = {
    init: initAdminNumberSteppers,
    clampValue: clampValue,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initAdminNumberSteppers(document);
    });
  } else {
    initAdminNumberSteppers(document);
  }
})();
