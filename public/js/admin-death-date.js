/* 1.31.3: choose Hebrew or Gregorian date of death; live Hebrew date preview for Gregorian input. */
(function () {
  'use strict';

  function hebrewLocale() {
    var lang = (document.documentElement.getAttribute('lang') || 'he').slice(0, 2);
    return (lang === 'ru' || lang === 'en' ? lang : 'he') + '-u-ca-hebrew';
  }

  function formatHebrew(year, month, day, afterSunset) {
    var d = new Date(year, month - 1, day, 12, 0, 0);
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return '';
    if (afterSunset) d.setDate(d.getDate() + 1);
    try {
      return new Intl.DateTimeFormat(hebrewLocale(), { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
    } catch (e) {
      return '';
    }
  }

  function setMode(root, mode) {
    var radio = root.querySelector('.death-mode-input[value="' + mode + '"]');
    if (radio) radio.checked = true;
    root.querySelectorAll('[data-death-panel]').forEach(function (panel) {
      panel.hidden = panel.getAttribute('data-death-panel') !== mode;
    });
    updatePreview(root);
  }

  function currentMode(root) {
    var checked = root.querySelector('.death-mode-input:checked');
    return checked ? checked.value : 'gregorian';
  }

  function updatePreview(root) {
    var box = root.querySelector('[data-death-hebrew-preview]');
    if (!box) return;
    var day = parseInt((root.querySelector('.death-greg-day') || {}).value, 10);
    var month = parseInt((root.querySelector('.death-greg-month') || {}).value, 10);
    var year = parseInt((root.querySelector('.death-greg-year') || {}).value, 10);
    var after = !!root.querySelector('input[name="diedAfterSunset"][value="after"]:checked');
    var text = day && month && year && year > 999 ? formatHebrew(year, month, day, after) : '';
    box.querySelector('strong').textContent = text;
    box.hidden = !text || currentMode(root) !== 'gregorian';
  }

  function init(root) {
    root.addEventListener('change', function (event) {
      if (event.target.classList.contains('death-mode-input')) {
        setMode(root, event.target.value);
      } else {
        updatePreview(root);
      }
    });
    root.addEventListener('input', function () { updatePreview(root); });
    updatePreview(root);
  }

  /** Fill an edit form from a person object (called by admin-people.js). */
  function fillFromPerson(root, person) {
    if (!root) return;
    var heb = person && person.hebrewDateOfDeath;
    var useHebrew = person && person.deathDateMode === 'hebrew' && heb && heb.month && heb.date;
    root.querySelector('.death-heb-day').value = useHebrew ? String(heb.date) : '';
    root.querySelector('.death-heb-month').value = useHebrew ? String(heb.month) : '';
    root.querySelector('.death-heb-year').value = useHebrew && heb.year ? String(heb.year) : '';
    setMode(root, useHebrew ? 'hebrew' : 'gregorian');
  }

  function reset(root) {
    if (!root) return;
    setMode(root, 'gregorian');
  }

  document.querySelectorAll('[data-death-date-root]').forEach(init);
  window.AdminDeathDate = { fillFromPerson: fillFromPerson, reset: reset, formatHebrew: formatHebrew };
})();
