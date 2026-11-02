(function () {
  const toggler = document.querySelector('.admin-navbar-toggler');
  const drawer = document.getElementById('adminNavbar');
  const backdrop = document.getElementById('adminNavBackdrop');
  if (!toggler || !drawer || !backdrop) {
    return;
  }

  function isMobileNav() {
    return window.matchMedia('(max-width: 991.98px)').matches;
  }

  function setOpen(open) {
    drawer.classList.toggle('is-open', open);
    backdrop.classList.toggle('is-open', open);
    toggler.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.classList.toggle('admin-nav-open', open);
  }

  function closeDrawer() {
    setOpen(false);
  }

  toggler.addEventListener('click', function () {
    if (!isMobileNav()) {
      return;
    }
    setOpen(!drawer.classList.contains('is-open'));
  });

  backdrop.addEventListener('click', closeDrawer);

  drawer.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      if (isMobileNav()) {
        closeDrawer();
      }
    });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeDrawer();
    }
  });

  window.addEventListener('resize', function () {
    if (!isMobileNav()) {
      closeDrawer();
    }
  });
})();

/* 1.32.0 I42: phone layout: no hamburger. Home = preview + tiles; every inner page has a
 * "back to main" bar and its main action as a floating bottom button. */
(function () {
  var mq = window.matchMedia('(max-width: 767.98px)');
  var body = document.body;
  var slug = body.getAttribute('data-slug') || '';
  var nav = body.getAttribute('data-admin-nav') || '';
  function isPhone() { return mq.matches; }

  // Landing on the settings page from outside the admin (login, installed app) on a phone -> home tiles.
  if (isPhone() && nav === 'settings' && !window.location.search && slug) {
    var ref = document.referrer || '';
    var inside = ref.indexOf(window.location.origin + '/admin/' + slug + '/') === 0;
    if (!inside) {
      window.location.replace('/admin/' + slug + '/home');
      return;
    }
  }

  var brand = document.querySelector('.admin-navbar-brand[data-mobile-href]');
  if (brand) {
    brand.addEventListener('click', function (e) {
      if (isPhone()) {
        e.preventDefault();
        window.location.href = brand.getAttribute('data-mobile-href');
      }
    });
  }

  var fab = null;
  function currentTarget() {
    var list = document.querySelectorAll('[data-mobile-fab]');
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].offsetParent !== null || list[i].getAttribute('data-mobile-fab') === 'always') return list[i];
    }
    return null;
  }
  function syncFab() {
    var target = isPhone() ? currentTarget() : null;
    if (!target) {
      if (fab) fab.hidden = true;
      body.classList.remove('has-mobile-fab');
      return;
    }
    if (!fab) {
      fab = document.createElement('button');
      fab.type = 'button';
      fab.className = 'admin-mobile-fab';
      fab.addEventListener('click', function () {
        var t = currentTarget();
        if (t) t.click();
      });
      body.appendChild(fab);
    }
    fab.textContent = target.getAttribute('data-mobile-fab-label') || (target.textContent || '').trim();
    fab.hidden = false;
    body.classList.add('has-mobile-fab');
  }
  window.adminSyncMobileFab = syncFab;
  if (mq.addEventListener) mq.addEventListener('change', syncFab);
  document.addEventListener('DOMContentLoaded', syncFab);
  window.addEventListener('load', syncFab);
})();
