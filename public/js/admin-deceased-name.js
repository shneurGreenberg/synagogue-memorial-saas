/* 1.36.0 I67: admin "add/edit deceased" — live preview of the name built from the three parts
   (Surname / Given name / Parent name) + the male/female choice. The server builds the same with
   lib/person-name.js (composeAdminName) and lib/deceased-board-name.js.
   1.40.0 I88: the form has a separate Surname input; the preview composes the name the same way the
   server does for the community's name order.
   1.41.0: three normalized inputs — givenName holds only the given-name words, parentName the parent,
   and the בן/בת marker comes from the gender choice. The preview is read-only, never a form field. */
(function () {
  var PREFIXES = { he: { male: 'בן', female: 'בת' }, ru: { male: 'бен', female: 'бат' }, en: { male: 'ben', female: 'bat' } };
  var STRIP = /^(בן|בת|сын|дочь|son|daughter)\s+/i;
  var MARKERS = ['בן', 'בת', 'бен', 'бат', 'ben', 'bat'];
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
      return MARKERS.indexOf(String(token).toLowerCase()) !== -1;
    });
  }
  function compose(base, surname, order) {
    var family = String(surname || '').trim();
    var given = String(base || '').trim();
    if (!family || !given) return given || family;
    if (order !== 'given-first') return family + ' ' + given;
    var parts = given.split(/\s+/).filter(Boolean);
    if (!parts.length) return family;
    return [parts[0], family].concat(parts.slice(1)).join(' ').trim();
  }
  function field(root, part) {
    return root.querySelector('[data-deceased-name-part="' + part + '"]');
  }

  function bind(preview) {
    if (preview.__deceasedNameBound) {
      if (typeof preview.__deceasedNameUpdate === 'function') preview.__deceasedNameUpdate();
      return;
    }
    var form = preview.closest('form');
    if (!form) return;
    var givenEl = field(form, 'givenName') || form.querySelector('input[name="givenName"]');
    var parentEl = field(form, 'parent') || form.querySelector('input[name="parentName"]');
    var surnameEl = field(form, 'surname') || form.querySelector('input[name="surname"]');
    if (!givenEl) return;

    function update() {
      var surname = surnameEl ? String(surnameEl.value || '').trim() : '';
      var givenName = stripSurname(String(givenEl.value || '').trim(), surname).replace(STRIP, '');
      var parentName = parentEl ? String(parentEl.value || '').trim() : '';
      var label = preview.getAttribute('data-label') || '';
      if (!givenName) {
        preview.hidden = true;
        preview.textContent = '';
        return;
      }
      var order = preview.getAttribute('data-name-order') || 'surname-first';
      // A legacy given name that already carries its בן/בת part is never given a second marker.
      var base = givenName;
      if (parentName && !hasPatronymic(givenName)) {
        var checked = form.querySelector('input[name="gender"]:checked');
        var gender = checked && checked.value === 'female' ? 'female' : 'male';
        var lang = script(givenName + ' ' + parentName) || preview.getAttribute('data-lang') || 'ru';
        var words = PREFIXES[lang] || PREFIXES.ru;
        var genderKnown = checked && (checked.value === 'male' || checked.value === 'female');
        var prefix = genderKnown ? words[gender] : words.male + '/' + words.female;
        base = givenName + ' ' + prefix + ' ' + parentName;
      }
      preview.textContent = label + ' ' + compose(base, surname, order);
      preview.hidden = false;
    }

    form.addEventListener('input', update);
    form.addEventListener('change', update);
    form.addEventListener('reset', function () { window.setTimeout(update, 0); });
    preview.__deceasedNameBound = true;
    preview.__deceasedNameUpdate = update;
    update();
  }

  function init() {
    document.querySelectorAll('[data-deceased-name-preview]').forEach(bind);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  // The edit modal is filled from the loaded people list; refresh the preview afterwards.
  window.AdminDeceasedNamePreview = { refresh: init };
})();
