/* 1.36.0 I70: admin colour picker with three sliders (hue / saturation / brightness).
   The browser's own picker (Chrome on Android, «More» view) mirrors its three sliders in a
   right-to-left UI but not their gradients, so on a Hebrew phone dragging toward the white end set
   black and vice versa. This picker replaces it for every <input type="color"> in the admin:
   each slider is explicitly dir="ltr" and its track gradient is drawn left→right from the same
   values, so the colour under the thumb is always the colour you get — in Hebrew and Russian alike.
   The <input type="color"> keeps its name/value, so forms, previews and saving are unchanged. */
(function () {
  'use strict';
  if (window.__adminColorPicker) return;
  window.__adminColorPicker = true;

  var TEXT = {
    he: { hue: 'גוון', sat: 'רוויה', val: 'בהירות', done: 'סיום', hex: 'קוד צבע' },
    ru: { hue: 'Оттенок', sat: 'Насыщенность', val: 'Яркость', done: 'Готово', hex: 'Код цвета' },
    en: { hue: 'Hue', sat: 'Saturation', val: 'Brightness', done: 'Done', hex: 'Colour code' },
  };
  function text() {
    var lang = String(document.documentElement.getAttribute('lang') || 'ru').slice(0, 2);
    return TEXT[lang] || TEXT.ru;
  }

  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
  function hexToRgb(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) {
      var s = /^#?([0-9a-f]{3})$/i.exec(String(hex || '').trim());
      if (!s) return { r: 0, g: 0, b: 0 };
      m = [null, s[1].split('').map(function (c) { return c + c; }).join('')];
    }
    var n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function rgbToHex(rgb) {
    return '#' + [rgb.r, rgb.g, rgb.b].map(function (v) {
      var h = clamp(Math.round(v), 0, 255).toString(16);
      return h.length < 2 ? '0' + h : h;
    }).join('');
  }
  function rgbToHsv(rgb) {
    var r = rgb.r / 255; var g = rgb.g / 255; var b = rgb.b / 255;
    var max = Math.max(r, g, b); var min = Math.min(r, g, b); var d = max - min;
    var h = 0;
    if (d) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return { h: h, s: max ? (d / max) * 100 : 0, v: max * 100 };
  }
  function hsvToRgb(hsv) {
    var h = ((hsv.h % 360) + 360) % 360; var s = clamp(hsv.s, 0, 100) / 100; var v = clamp(hsv.v, 0, 100) / 100;
    var c = v * s; var x = c * (1 - Math.abs(((h / 60) % 2) - 1)); var m = v - c;
    var p = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return { r: (p[0] + m) * 255, g: (p[1] + m) * 255, b: (p[2] + m) * 255 };
  }
  function hsvHex(h, s, v) { return rgbToHex(hsvToRgb({ h: h, s: s, v: v })); }

  /** Left→right gradients that match each slider's value range (exported for tests). */
  function trackGradients(hsv) {
    var hueStops = [0, 60, 120, 180, 240, 300, 360].map(function (h) { return hsvHex(h, 100, 100); });
    return {
      hue: 'linear-gradient(to right, ' + hueStops.join(', ') + ')',
      sat: 'linear-gradient(to right, ' + hsvHex(hsv.h, 0, hsv.v) + ', ' + hsvHex(hsv.h, 100, hsv.v) + ')',
      val: 'linear-gradient(to right, ' + hsvHex(hsv.h, hsv.s, 0) + ', ' + hsvHex(hsv.h, hsv.s, 100) + ')',
    };
  }
  window.adminColorPickerMath = { hexToRgb: hexToRgb, rgbToHex: rgbToHex, rgbToHsv: rgbToHsv, hsvToRgb: hsvToRgb, trackGradients: trackGradients };

  var pop = null;
  var current = null; // { input, hsv }

  function build() {
    var t = text();
    pop = document.createElement('div');
    pop.className = 'admin-color-popover';
    pop.setAttribute('dir', 'ltr');
    pop.setAttribute('role', 'dialog');
    pop.hidden = true;
    pop.innerHTML = ''
      + '<div class="admin-color-popover-head">'
      + '  <span class="admin-color-popover-swatch" data-cp="swatch"></span>'
      + '  <input type="text" class="form-control admin-color-popover-hex" data-cp="hex" maxlength="7" spellcheck="false" autocomplete="off" dir="ltr" aria-label="' + t.hex + '">'
      + '</div>'
      + slider('hue', t.hue, 360)
      + slider('sat', t.sat, 100)
      + slider('val', t.val, 100)
      + '<div class="admin-color-popover-foot"><button type="button" class="btn-admin btn-admin-primary btn-admin-sm" data-cp="done">' + t.done + '</button></div>';
    document.body.appendChild(pop);
    ['hue', 'sat', 'val'].forEach(function (k) {
      pop.querySelector('[data-cp="' + k + '"]').addEventListener('input', onSlider);
    });
    pop.querySelector('[data-cp="hex"]').addEventListener('input', onHex);
    pop.querySelector('[data-cp="done"]').addEventListener('click', close);
  }
  function slider(key, label, max) {
    return '<label class="admin-color-popover-row">'
      + '<span class="admin-color-popover-label">' + label + '</span>'
      + '<input type="range" dir="ltr" min="0" max="' + max + '" step="1" class="admin-color-slider admin-color-slider--' + key + '" data-cp="' + key + '">'
      + '</label>';
  }

  function render(skipHex) {
    var hsv = current.hsv;
    var g = trackGradients(hsv);
    var hex = hsvHex(hsv.h, hsv.s, hsv.v);
    pop.querySelector('[data-cp="hue"]').style.background = g.hue;
    pop.querySelector('[data-cp="sat"]').style.background = g.sat;
    pop.querySelector('[data-cp="val"]').style.background = g.val;
    pop.querySelector('[data-cp="hue"]').value = String(Math.round(hsv.h));
    pop.querySelector('[data-cp="sat"]').value = String(Math.round(hsv.s));
    pop.querySelector('[data-cp="val"]').value = String(Math.round(hsv.v));
    pop.querySelector('[data-cp="swatch"]').style.background = hex;
    if (!skipHex) pop.querySelector('[data-cp="hex"]').value = hex;
  }
  function commit() {
    if (!current.input.isConnected) { close(); return; }
    var hex = hsvHex(current.hsv.h, current.hsv.s, current.hsv.v);
    if (current.input.value.toLowerCase() === hex) return;
    current.input.value = hex;
    current.input.dispatchEvent(new Event('input', { bubbles: true }));
    current.input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function onSlider() {
    if (!current) return;
    current.hsv = {
      h: Number(pop.querySelector('[data-cp="hue"]').value),
      s: Number(pop.querySelector('[data-cp="sat"]').value),
      v: Number(pop.querySelector('[data-cp="val"]').value),
    };
    render();
    commit();
  }
  function onHex(e) {
    if (!current) return;
    var v = String(e.target.value || '').trim();
    if (v.charAt(0) !== '#') v = '#' + v;
    if (!/^#[0-9a-f]{6}$/i.test(v)) return;
    current.hsv = rgbToHsv(hexToRgb(v));
    render(true);
    commit();
  }

  function place(input) {
    var narrow = window.matchMedia && window.matchMedia('(max-width: 640px)').matches;
    pop.classList.toggle('is-sheet', !!narrow);
    if (narrow) { pop.style.left = ''; pop.style.top = ''; return; }
    var r = input.getBoundingClientRect();
    var w = pop.offsetWidth || 280; var h = pop.offsetHeight || 220;
    var left = clamp(r.left + r.width / 2 - w / 2, 8, window.innerWidth - w - 8);
    var top = r.bottom + 8;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }
  function open(input) {
    if (!pop) build();
    current = { input: input, hsv: rgbToHsv(hexToRgb(input.value)) };
    pop.hidden = false;
    render();
    place(input);
    var first = pop.querySelector('[data-cp="hue"]');
    if (first && !(window.matchMedia && window.matchMedia('(pointer: coarse)').matches)) first.focus();
  }
  function close() {
    if (!pop || pop.hidden) return;
    pop.hidden = true;
    var input = current && current.input;
    current = null;
    if (input && input.focus) { try { input.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  }

  function isAdminColorInput(el) {
    return el && el.tagName === 'INPUT' && el.type === 'color' && !el.disabled;
  }
  document.addEventListener('click', function (e) {
    var el = e.target;
    if (isAdminColorInput(el)) {
      e.preventDefault();
      if (current && current.input === el && !pop.hidden) { close(); return; }
      open(el);
      return;
    }
    if (pop && !pop.hidden && !pop.contains(el)) close();
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { close(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && isAdminColorInput(e.target)) {
      e.preventDefault();
      open(e.target);
    }
  });
  window.addEventListener('resize', function () { if (current && pop && !pop.hidden) place(current.input); });
  window.addEventListener('scroll', function () { if (current && pop && !pop.hidden && !pop.classList.contains('is-sheet')) place(current.input); }, true);
})();
