/* 1.36.0 I67: admin "add deceased" — live preview of the board name built from the deceased's
   name + father's name + gender (the server builds the same with lib/deceased-board-name.js). */
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
  function bind(preview) {
    var form = preview.closest('form');
    if (!form) return;
    var nameEl = form.querySelector('[data-deceased-name-part="name"]');
    var fatherEl = form.querySelector('[data-deceased-name-part="father"]');
    if (!nameEl || !fatherEl) return;
    function update() {
      var name = String(nameEl.value || '').trim().replace(STRIP, '');
      var father = String(fatherEl.value || '').trim();
      if (!name || !father) { preview.hidden = true; preview.textContent = ''; return; }
      var checked = form.querySelector('input[name="gender"]:checked');
      var gender = checked && checked.value === 'female' ? 'female' : 'male';
      var lang = script(name + ' ' + father) || preview.getAttribute('data-lang') || 'ru';
      var words = PREFIXES[lang] || PREFIXES.ru;
      var genderKnown = checked && (checked.value === 'male' || checked.value === 'female');
      var prefix = genderKnown ? words[gender] : words.male + '/' + words.female;
      preview.textContent = (preview.getAttribute('data-label') || '') + ' ' + name + ' ' + prefix + ' ' + father;
      preview.hidden = false;
    }
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    form.addEventListener('reset', function () { window.setTimeout(update, 0); });
    update();
  }
  document.querySelectorAll('[data-deceased-name-preview]').forEach(bind);
})();
