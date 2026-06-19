(function () {
  const list = document.getElementById('peopleList');
  const peopleDataEl = document.getElementById('people-data');

  if (!list || !peopleDataEl) {
    return;
  }

  const people = JSON.parse(peopleDataEl.textContent);
  const peopleById = {};
  people.forEach(function (person) {
    peopleById[person.id] = person;
  });

  const searchInput = document.getElementById('peopleSearch');
  const sortSelect = document.getElementById('peopleSort');
  const THUMB_WIDTH = 128;

  let activeEditPersonId = null;
  let editListSnapshot = null;
  let editFormSubmitted = false;
  let lazyPhotoObserver = null;

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

  function buildThumbUrl(photo, crop) {
    if (!photo) {
      return '';
    }

    const normalized = normalizeCrop(crop);
    const params = new URLSearchParams({
      w: String(THUMB_WIDTH),
      cx: String(normalized.x),
      cy: String(normalized.y),
      cz: String(normalized.zoom),
    });

    return '/photos/' + encodeURIComponent(photo) + '?' + params.toString();
  }

  function buildFullUrl(photo) {
    return photo ? '/photos/' + encodeURIComponent(photo) : '';
  }

  function applyCropStyles(img, crop) {
    const normalized = normalizeCrop(crop);
    img.style.objectFit = 'cover';
    img.style.objectPosition = normalized.x + '% ' + normalized.y + '%';
    img.style.transformOrigin = normalized.x + '% ' + normalized.y + '%';
    img.style.transform = normalized.zoom !== 1 ? 'scale(' + normalized.zoom + ')' : '';
    return normalized;
  }

  function loadLazyPhoto(img) {
    const thumbSrc = img.getAttribute('data-thumb-src');
    if (!thumbSrc || img.getAttribute('data-loaded') === '1') {
      return;
    }

    img.setAttribute('data-loaded', '1');
    img.src = thumbSrc;
  }

  function initLazyPhotos(root) {
    const scope = root || list;
    const images = scope.querySelectorAll('img.lazy-person-photo[data-thumb-src]:not([data-loaded])');

    if (!images.length) {
      return;
    }

    if ('IntersectionObserver' in window) {
      if (!lazyPhotoObserver) {
        lazyPhotoObserver = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) {
              return;
            }

            loadLazyPhoto(entry.target);
            lazyPhotoObserver.unobserve(entry.target);
          });
        }, {
          root: null,
          rootMargin: '240px 0px',
          threshold: 0.01,
        });
      }

      images.forEach(function (img) {
        lazyPhotoObserver.observe(img);
      });
      return;
    }

    images.forEach(loadLazyPhoto);
  }

  function getListRowElements(personId) {
    const row = list.querySelector('.person-row[data-id="' + personId + '"]');
    if (!row) {
      return null;
    }

    return {
      row: row,
      wrap: row.querySelector('.person-photo-wrap'),
      img: row.querySelector('.person-photo-wrap .person-photo'),
      placeholder: row.querySelector('.person-photo-placeholder'),
    };
  }

  function updateListRowPhoto(personId, crop, photoFilename) {
    const elements = getListRowElements(personId);
    if (!elements) {
      return;
    }

    const wrap = elements.wrap;
    const placeholder = elements.placeholder;

    if (!photoFilename) {
      if (wrap) {
        wrap.classList.add('d-none');
      }
      if (placeholder) {
        placeholder.classList.remove('d-none');
      }
      return;
    }

    if (!wrap) {
      return;
    }

    let img = elements.img;
    if (!img) {
      img = document.createElement('img');
      img.className = 'person-photo lazy-person-photo';
      img.decoding = 'async';
      img.alt = (peopleById[personId] && peopleById[personId].name) || '';
      wrap.appendChild(img);
    }

    const thumbSrc = buildThumbUrl(photoFilename, crop);
    img.setAttribute('data-thumb-src', thumbSrc);
    img.setAttribute('data-full-src', buildFullUrl(photoFilename));
    img.removeAttribute('style');
    img.removeAttribute('data-loaded');

    if (img.src) {
      img.removeAttribute('src');
    }

    wrap.classList.remove('d-none');
    if (placeholder) {
      placeholder.classList.add('d-none');
    }

    if (peopleById[personId]) {
      peopleById[personId].photoCrop = crop;
    }

    initLazyPhotos(wrap);
  }

  function initPhotoCropEditor(editor) {
    const viewport = editor.querySelector('.photo-crop-viewport');
    const controls = editor.querySelector('.photo-crop-controls');
    const zoomInput = editor.querySelector('.photo-crop-zoom');
    const hiddenX = editor.querySelector('.photo-crop-x');
    const hiddenY = editor.querySelector('.photo-crop-y');
    const hiddenZoom = editor.querySelector('.photo-crop-zoom-value');
    const emptyHtml = viewport.innerHTML;
    let onCropChange = null;
    let img = null;
    let posX = 50;
    let posY = 50;
    let zoom = 1;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startPosX = 50;
    let startPosY = 50;

    function syncHidden() {
      hiddenX.value = String(posX);
      hiddenY.value = String(posY);
      hiddenZoom.value = String(zoom);
      if (zoomInput) {
        zoomInput.value = String(zoom);
      }
      if (onCropChange) {
        onCropChange({ x: posX, y: posY, zoom: zoom }, img ? img.src : null);
      }
    }

    function setCrop(crop, src, alt) {
      posX = clamp(Number(crop && crop.x) || 50, 0, 100);
      posY = clamp(Number(crop && crop.y) || 50, 0, 100);
      zoom = clamp(Number(crop && crop.zoom) || 1, 1, 3);
      viewport.innerHTML = '';
      img = document.createElement('img');
      img.src = src;
      img.alt = alt || '';
      img.draggable = false;
      applyCropStyles(img, { x: posX, y: posY, zoom: zoom });
      viewport.appendChild(img);
      controls.hidden = false;
      syncHidden();
    }

    function clearCrop() {
      img = null;
      dragging = false;
      viewport.innerHTML = emptyHtml;
      controls.hidden = true;
      posX = 50;
      posY = 50;
      zoom = 1;
      syncHidden();
    }

    function onPointerMove(clientX, clientY) {
      if (!dragging || !img) {
        return;
      }

      const rect = viewport.getBoundingClientRect();
      const dx = ((clientX - startX) / rect.width) * 100;
      const dy = ((clientY - startY) / rect.height) * 100;
      posX = clamp(startPosX - dx, 0, 100);
      posY = clamp(startPosY - dy, 0, 100);
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

    viewport.addEventListener('touchstart', function (event) {
      if (!img || !event.touches[0]) {
        return;
      }

      dragging = true;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
      startPosX = posX;
      startPosY = posY;
    }, { passive: true });

    document.addEventListener('mousemove', function (event) {
      onPointerMove(event.clientX, event.clientY);
    });

    document.addEventListener('mouseup', function () {
      dragging = false;
    });

    document.addEventListener('touchmove', function (event) {
      if (!event.touches[0]) {
        return;
      }

      onPointerMove(event.touches[0].clientX, event.touches[0].clientY);
    }, { passive: true });

    document.addEventListener('touchend', function () {
      dragging = false;
    });

    if (zoomInput) {
      zoomInput.addEventListener('input', function () {
        if (!img) {
          return;
        }

        zoom = clamp(Number(zoomInput.value) || 1, 1, 3);
        applyCropStyles(img, { x: posX, y: posY, zoom: zoom });
        syncHidden();
      });
    }

    return {
      setCrop: setCrop,
      clearCrop: clearCrop,
      setOnCropChange: function (callback) {
        onCropChange = callback;
      },
    };
  }

  const cropEditors = {};
  document.querySelectorAll('.photo-crop-editor').forEach(function (editor) {
    const key = editor.getAttribute('data-form');
    cropEditors[key] = initPhotoCropEditor(editor);
  });

  cropEditors.edit.setOnCropChange(function (crop) {
    if (activeEditPersonId == null) {
      return;
    }

    const person = peopleById[activeEditPersonId];
    if (!person || !person.photo) {
      return;
    }

    updateListRowPhoto(activeEditPersonId, crop, person.photo);
  });

  function applyFilters() {
    const query = searchInput.value.trim().toLowerCase();
    const sortBy = sortSelect.value;
    const rows = Array.from(list.querySelectorAll('.person-row'));

    rows.forEach(function (row) {
      const name = (row.getAttribute('data-name') || '').toLowerCase();
      row.style.display = !query || name.includes(query) ? '' : 'none';
    });

    const visible = rows.filter(function (row) { return row.style.display !== 'none'; });

    visible.sort(function (a, b) {
      if (sortBy === 'date') {
        return a.getAttribute('data-date').localeCompare(b.getAttribute('data-date'));
      }

      return a.getAttribute('data-name').localeCompare(b.getAttribute('data-name'));
    });

    visible.forEach(function (row) {
      list.appendChild(row);
    });

    initLazyPhotos(list);
  }

  function showEditModal() {
    if (typeof window.jQuery !== 'undefined') {
      window.jQuery('#editPersonModal').modal('show');
    }
  }

  function initEditModalHandlers() {
    if (typeof window.jQuery === 'undefined') {
      return;
    }

    window.jQuery('#editPersonModal').off('hidden.bs.modal.people').on('hidden.bs.modal.people', function () {
      if (!editFormSubmitted && activeEditPersonId != null && editListSnapshot) {
        updateListRowPhoto(
          activeEditPersonId,
          editListSnapshot.crop,
          editListSnapshot.photo,
        );
      }

      editFormSubmitted = false;
      activeEditPersonId = null;
      editListSnapshot = null;
    });
  }

  function initPeoplePage() {
    const editForm = document.querySelector('#editPersonModal form');
    if (editForm) {
      editForm.addEventListener('submit', function () {
        editFormSubmitted = true;
      });
    }

    document.querySelectorAll('input[type="file"][data-crop-editor]').forEach(function (input) {
      input.addEventListener('change', function () {
        const key = input.getAttribute('data-crop-editor');
        const editor = cropEditors[key];
        const file = input.files && input.files[0];
        if (!editor || !file) {
          return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
          editor.setCrop({ x: 50, y: 50, zoom: 1 }, e.target.result, file.name);
        };
        reader.readAsDataURL(file);
      });
    });

    searchInput.addEventListener('input', applyFilters);
    sortSelect.addEventListener('change', applyFilters);

    const deletePhotoCheck = document.getElementById('deletePhotoCheck');
    if (deletePhotoCheck) {
      deletePhotoCheck.addEventListener('change', function (event) {
        if (event.target.checked) {
          cropEditors.edit.clearCrop();
          if (activeEditPersonId != null) {
            updateListRowPhoto(activeEditPersonId, { x: 50, y: 50, zoom: 1 }, null);
          }
        } else if (activeEditPersonId != null) {
          const person = peopleById[activeEditPersonId];
          if (person && person.photo) {
            cropEditors.edit.setCrop(
              person.photoCrop || { x: 50, y: 50, zoom: 1 },
              buildFullUrl(person.photo),
              person.name || '',
            );
          }
        }
      });
    }

    document.querySelectorAll('.edit-btn').forEach(function (button) {
      button.addEventListener('click', function () {
        const id = Number(button.getAttribute('data-id'));
        const person = peopleById[id];
        if (!person) {
          return;
        }

        activeEditPersonId = id;
        editListSnapshot = {
          crop: person.photoCrop || { x: 50, y: 50, zoom: 1 },
          photo: person.photo || null,
        };

        document.getElementById('editId').value = person.id;
        document.getElementById('editName').value = person.name || '';
        document.getElementById('editDate').value = person.gregorianDateOfDeath.date;
        document.getElementById('editMonth').value = person.gregorianDateOfDeath.month;
        document.getElementById('editYear').value = person.gregorianDateOfDeath.year;
        document.getElementById('editText').value = person.text || '';
        document.getElementById('deletePhotoCheck').checked = false;

        if (person.photo) {
          cropEditors.edit.setCrop(
            person.photoCrop || { x: 50, y: 50, zoom: 1 },
            buildFullUrl(person.photo),
            person.name || '',
          );
        } else {
          cropEditors.edit.clearCrop();
        }

        showEditModal();
      });
    });

    initLazyPhotos(list);
    initEditModalHandlers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPeoplePage);
  } else {
    initPeoplePage();
  }
})();
