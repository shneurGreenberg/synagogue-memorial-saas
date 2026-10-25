/* 1.28.0 F3 — animated sliding highlight for pill toggles (add-name page). */
(function () {
  function activeItem(group) {
    if (group.classList.contains('public-lang-switch-pills')) {
      return group.querySelector('.public-lang-pill.is-active');
    }
    var checked = group.querySelector('input:checked');
    return checked ? checked.closest('.public-pill-option').querySelector('span') : null;
  }

  function place(group, slider, target, animate) {
    if (!target) {
      slider.style.opacity = '0';
      return;
    }
    var g = group.getBoundingClientRect();
    var t = target.getBoundingClientRect();
    if (!animate) {
      slider.style.transition = 'none';
    }
    slider.style.opacity = '1';
    slider.style.width = t.width + 'px';
    slider.style.height = t.height + 'px';
    slider.style.transform = 'translate(' + (t.left - g.left - group.clientLeft) + 'px,' + (t.top - g.top - group.clientTop) + 'px)';
    if (!animate) {
      // force reflow, then re-enable transitions
      void slider.offsetWidth;
      slider.style.transition = '';
    }
  }

  function setup(group) {
    if (group.dataset.sliderReady === '1') {
      return;
    }
    group.dataset.sliderReady = '1';
    group.classList.add('has-slider');
    var slider = document.createElement('span');
    slider.className = 'public-pill-slider';
    slider.setAttribute('aria-hidden', 'true');
    group.insertBefore(slider, group.firstChild);
    place(group, slider, activeItem(group), false);

    if (group.classList.contains('public-lang-switch-pills')) {
      group.addEventListener('click', function (event) {
        var link = event.target.closest('.public-lang-pill');
        if (!link || link.classList.contains('is-active') || event.metaKey || event.ctrlKey) {
          return;
        }
        event.preventDefault();
        group.querySelectorAll('.public-lang-pill').forEach(function (a) { a.classList.remove('is-active'); });
        link.classList.add('is-active');
        place(group, slider, link, true);
        setTimeout(function () { window.location.href = link.href; }, 260);
      });
    } else {
      group.addEventListener('change', function () {
        place(group, slider, activeItem(group), true);
      });
    }
    window.addEventListener('resize', function () {
      place(group, slider, activeItem(group), false);
    });
  }

  function init(root) {
    (root || document).querySelectorAll('.public-pill-group, .public-lang-switch-pills').forEach(setup);
  }

  window.PublicPillSlider = { init: init };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); });
  } else {
    init();
  }
  // Deceased blocks are added dynamically.
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(function () { init(); }).observe(document.body, { childList: true, subtree: true });
  }
})();
