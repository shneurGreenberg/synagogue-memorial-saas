(function () {
  function initAdminCandlePreview() {
    var select = document.getElementById('candlePalette');
    var preview = document.getElementById('adminCandlePreview');
    if (!select || !preview || !window.AdminCandlePalette) {
      return;
    }

    function sync() {
      window.AdminCandlePalette.applyCandlePaletteToElement(preview, select.value);
    }

    select.addEventListener('change', sync);
    sync();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminCandlePreview);
  } else {
    initAdminCandlePreview();
  }
})();
