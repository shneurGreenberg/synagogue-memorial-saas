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
