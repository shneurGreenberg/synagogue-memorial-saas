/* 1.36.0 I67: admin "add deceased" — live preview of the board name built from the deceased's
   name + father's name + gender (the server builds the same with lib/person-name.js and
   lib/deceased-board-name.js).
   1.40.0 I88: the form has a separate Surname input; the preview composes the name the same way
   the server does for the community's name order. */
(function () {
  var PREFIXES = { he: { male: 'בן', female: 'בת' }, ru: { male: 'бен', female: 'бат' }, en: { male: 'ben', female: 'bat' } };
  var STRIP = /^(בן|בת|сын|дочь|son|daughter)\s+/i;
  function script(text) {
    var v = String(text || '');
    var he = (v.match(/[\u05D0-\u05EA]/g) || []).length;
    var ru = (v.match(/[\u0400-\u04FF]/g) || []).length;
    var en = (v.match(/[A-Za-z]/g) || []).length;
    var max = Math.max(he, ru, en);
    if (!max) return '';
    return he === max ? 'he' : (ru === max ? 'ru' : 'en');
  }
  function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  function stripSurname(name, surname) {
    var value = String(name || '').trim();
    var family = String(surname || '').trim();
    if (!value || !family) return value;
    var escaped = escapeRegex(family);
    var leading = new RegExp('^' + escaped + '\\s+', 'i');
    if (leading.test(value)) return value.replace(leading, '').trim();
    // given-first: the surname sits right after the first given-name token.
    var afterFirst = new RegExp('^(\\S+)\\s+' + escaped + '(?=\\s|$)', 'i');
    if (afterFirst.test(value)) return value.replace(afterFirst, '$1').replace(/\s+/g, ' ').trim();
    var trailing = new RegExp('\\s+' + escaped + '$', 'i');
    if (trailing.test(value)) return value.replace(trailing, '').trim();
    return value;
  }
  function hasPatronymic(name) {
    return String(name || '').split(/\s+/).some(function (token) {
      return ['בן', 'בת', 'бен', 'бат', 'ben', 'bat'].indexOf(String(token).toLowerCase()) !== -1;
    });
  }
  function compose(name, surname, order) {
    var family = String(surname || '').trim();
    var given = String(name || '').trim();
    if (!family || !given) return given || family;
    if (order !== 'given-first') return family + ' ' + given;
    var parts = given.split(/\s+/).filter(Boolean);
    if (!parts.length) return family;
    return [parts[0], family].concat(parts.slice(1)).join(' ').trim();
  }
  function bind(preview) {
    var form = preview.closest('form');
    if (!form) return;
    var nameEl = form.querySelector('[data-deceased-name-part="name"]');
    var fatherEl = form.querySelector('[data-deceased-name-part="father"]');
    var surnameEl = form.querySelector('[data-deceased-name-part="surname"]')
      || form.querySelector('input[name="surname"]');
    if (!nameEl || !fatherEl) return;
    function update() {
      var surname = surnameEl ? String(surnameEl.value || '').trim() : '';
      var name = stripSurname(String(nameEl.value || '').trim(), surname).replace(STRIP, '');
      var father = String(fatherEl.value || '').trim();
      if (!name) { preview.hidden = true; preview.textContent = ''; return; }
      var order = preview.getAttribute('data-name-order') || 'surname-first';
      var label = preview.getAttribute('data-label') || '';
      if (!father) {
        preview.textContent = label + ' ' + compose(name, surname, order);
        preview.hidden = false;
        return;
      }
      var checked = form.querySelector('input[name="gender"]:checked');
      var gender = checked && checked.value === 'female' ? 'female' : 'male';
      var lang = script(name + ' ' + father) || preview.getAttribute('data-lang') || 'ru';
      var words = PREFIXES[lang] || PREFIXES.ru;
      var genderKnown = checked && (checked.value === 'male' || checked.value === 'female');
      var prefix = genderKnown ? words[gender] : words.male + '/' + words.female;
      // The typed name may already carry its בן/בת part — never add it twice.
      var given = hasPatronymic(name) ? name : name + ' ' + prefix + ' ' + father;
      preview.textContent = label + ' ' + compose(given, surname, order);
      preview.hidden = false;
    }
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    form.addEventListener('reset', function () { window.setTimeout(update, 0); });
    update();
  }
  document.querySelectorAll('[data-deceased-name-preview]').forEach(bind);
})();
