(function () {
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function normalizeCrop(crop) {
    return {
      x: clamp(Number(crop && crop.x) || 50, 0, 100),
      y: clamp(Number(crop && crop.y) || 50, 0, 100),
      zoom: clamp(Number(crop && crop.zoom) || 1, 1, 3),
    };
  }

  function axisPanLimits(visibleFraction) {
    if (!Number.isFinite(visibleFraction) || visibleFraction >= 1) {
      return { min: 50, max: 50 };
    }

    const slack = 50 * (1 - visibleFraction);
    return { min: 50 - slack, max: 50 + slack };
  }

  function getPanLimits(naturalWidth, naturalHeight, zoom, containerAspect) {
    if (!naturalWidth || !naturalHeight || !containerAspect) {
      return { minX: 50, maxX: 50, minY: 50, maxY: 50 };
    }

    const imageAspect = naturalWidth / naturalHeight;
    const z = Math.max(1, zoom);
    let visibleFractionX;
    let visibleFractionY;

    if (imageAspect > containerAspect) {
      visibleFractionX = containerAspect / (imageAspect * z);
      visibleFractionY = 1 / z;
    } else if (imageAspect < containerAspect) {
      visibleFractionX = 1 / z;
      visibleFractionY = imageAspect / (containerAspect * z);
    } else {
      visibleFractionX = 1 / z;
      visibleFractionY = 1 / z;
    }

    const xLimits = axisPanLimits(visibleFractionX);
    const yLimits = axisPanLimits(visibleFractionY);

    return {
      minX: xLimits.min,
      maxX: xLimits.max,
      minY: yLimits.min,
      maxY: yLimits.max,
    };
  }

  function applyCropStyles(img, crop) {
    const normalized = normalizeCrop(crop);
    img.style.objectFit = 'cover';
    img.style.objectPosition = normalized.x + '% ' + normalized.y + '%';
    img.style.transformOrigin = normalized.x + '% ' + normalized.y + '%';
    img.style.transform = normalized.zoom !== 1 ? 'scale(' + normalized.zoom + ')' : '';
    return normalized;
  }

  function initPhotoCropEditor(editor) {
    const viewport = editor.querySelector('.photo-crop-viewport');
    const controls = editor.querySelector('.photo-crop-controls');
    const zoomInput = editor.querySelector('.photo-crop-zoom');
    const hiddenX = editor.querySelector('.photo-crop-x');
    const hiddenY = editor.querySelector('.photo-crop-y');
    const hiddenZoom = editor.querySelector('.photo-crop-zoom-value');
    const fileInput = editor.querySelector('input[type="file"]');
    const emptyHtml = viewport.innerHTML;
    let img = null;
    let posX = 50;
    let posY = 50;
    let zoom = 1;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startPosX = 50;
    let startPosY = 50;

    function currentPanLimits() {
      if (!img || !img.naturalWidth) {
        return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
      }

      const rect = viewport.getBoundingClientRect();
      const containerAspect = rect.width / rect.height || 1;
      return getPanLimits(img.naturalWidth, img.naturalHeight, zoom, containerAspect);
    }

    function clampPosition() {
      const limits = currentPanLimits();
      posX = clamp(posX, limits.minX, limits.maxX);
      posY = clamp(posY, limits.minY, limits.maxY);
    }

    function syncHidden() {
      hiddenX.value = String(posX);
      hiddenY.value = String(posY);
      hiddenZoom.value = String(zoom);
      if (zoomInput) {
        zoomInput.value = String(zoom);
      }
    }

    function renderCrop() {
      if (!img) {
        return;
      }

      clampPosition();
      applyCropStyles(img, { x: posX, y: posY, zoom: zoom });
      syncHidden();
    }

    function setCropFromFile(file) {
      const reader = new FileReader();
      reader.onload = function () {
        posX = 50;
        posY = 50;
        zoom = 1;
        viewport.innerHTML = '';
        img = document.createElement('img');
        img.src = reader.result;
        img.alt = '';
        img.draggable = false;
        img.onload = function () {
          clampPosition();
          renderCrop();
        };
        viewport.appendChild(img);
        controls.hidden = false;
      };
      reader.readAsDataURL(file);
    }

    function onPointerMove(clientX, clientY) {
      if (!dragging || !img) {
        return;
      }

      const rect = viewport.getBoundingClientRect();
      const clampedX = clamp(clientX, rect.left, rect.right);
      const clampedY = clamp(clientY, rect.top, rect.bottom);
      const dx = ((clampedX - startX) / rect.width) * 100;
      const dy = ((clampedY - startY) / rect.height) * 100;
      const limits = currentPanLimits();
      posX = clamp(startPosX - dx, limits.minX, limits.maxX);
      posY = clamp(startPosY - dy, limits.minY, limits.maxY);
      applyCropStyles(img, { x: posX, y: posY, zoom: zoom });
      syncHidden();
    }

    viewport.addEventListener('mousedown', function (event) {
      if (!img || event.button !== 0) {
        return;
      }

      dragging = true;
      startX = event.clientX;
      startY = event.clientY;
      startPosX = posX;
      startPosY = posY;
      event.preventDefault();
    });

    document.addEventListener('mousemove', function (event) {
      onPointerMove(event.clientX, event.clientY);
    });

    document.addEventListener('mouseup', function () {
      dragging = false;
    });

    if (zoomInput) {
      zoomInput.addEventListener('input', function () {
        if (!img) {
          return;
        }

        zoom = clamp(Number(zoomInput.value) || 1, 1, 3);
        renderCrop();
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', function () {
        const file = fileInput.files && fileInput.files[0];
        if (!file) {
          return;
        }

        setCropFromFile(file);
      });
    }

    return {
      clear: function () {
        img = null;
        dragging = false;
        viewport.innerHTML = emptyHtml;
        controls.hidden = true;
        posX = 50;
        posY = 50;
        zoom = 1;
        syncHidden();
      },
    };
  }

  document.querySelectorAll('.public-photo-crop-editor').forEach(function (editor) {
    initPhotoCropEditor(editor);
  });
})();
