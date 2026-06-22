(function () {
  const page = document.querySelector('.people-page');
  const list = document.getElementById('peopleList');
  const peopleDataEl = document.getElementById('people-data');

  if (!page || !list || !peopleDataEl) {
    return;
  }

  let people = JSON.parse(peopleDataEl.textContent);
  const peopleById = {};
  people.forEach(function (person) {
    peopleById[person.id] = person;
  });

  const searchInput = document.getElementById('peopleSearch');
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

  function buildThumbUrl(photo) {
    if (!photo) {
      return '';
    }

    return '/photos/' + encodeURIComponent(photo) + '?w=' + THUMB_WIDTH;
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

  function syncPeopleData() {
    peopleDataEl.textContent = JSON.stringify(people);
  }

  function getRowCrop(personId) {
    const person = peopleById[personId];
    return normalizeCrop(person && person.photoCrop);
  }

  function applyListPhotoCrop(img) {
    const row = img.closest('.person-row');
    if (!row) {
      return;
    }

    const personId = Number(row.getAttribute('data-id'));
    applyCropStyles(img, getRowCrop(personId));
  }

  function loadLazyPhoto(img) {
    const thumbSrc = img.getAttribute('data-thumb-src');
    if (!thumbSrc || img.getAttribute('data-loaded') === '1') {
      return;
    }

    img.setAttribute('data-loaded', '1');
    img.onload = function () {
      applyListPhotoCrop(img);
    };
    img.onerror = function () {
      const wrap = img.closest('.person-photo-wrap');
      const row = img.closest('.person-row');
      if (wrap) {
        wrap.classList.add('d-none');
      }
      const placeholder = row && row.querySelector('.person-photo-placeholder');
      if (placeholder) {
        placeholder.classList.remove('d-none');
      }
    };
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

    const thumbSrc = buildThumbUrl(photoFilename);
    const sameThumb = img.getAttribute('data-thumb-src') === thumbSrc && img.getAttribute('src');

    img.setAttribute('data-thumb-src', thumbSrc);
    img.setAttribute('data-full-src', buildFullUrl(photoFilename));

    if (peopleById[personId]) {
      peopleById[personId].photoCrop = normalizeCrop(crop);
    }

    wrap.classList.remove('d-none');
    if (placeholder) {
      placeholder.classList.add('d-none');
    }

    if (sameThumb) {
      applyCropStyles(img, crop);
      return;
    }

    img.removeAttribute('data-loaded');
    if (img.getAttribute('src')) {
      img.removeAttribute('src');
    }

    initLazyPhotos(wrap);
    if (img.complete && img.naturalWidth) {
      applyCropStyles(img, crop);
    }
  }

  function updateListRowMeta(person) {
    const row = list.querySelector('.person-row[data-id="' + person.id + '"]');
    if (!row) {
      return;
    }

    row.setAttribute('data-name', person.name || '');
    row.setAttribute(
      'data-date',
      person.gregorianDateOfDeath.year + '-' + person.gregorianDateOfDeath.month + '-' + person.gregorianDateOfDeath.date,
    );

    const strong = row.querySelector('.person-meta strong');
    const small = row.querySelector('.person-meta small');
    if (strong) {
      strong.textContent = person.name || '';
    }
    if (small) {
      const parts = person.gregorianDateOfDeath;
      const dateLabel = page.getAttribute('data-date-label') || 'Date of death';
      small.textContent = dateLabel + ': ' + parts.date + '/' + parts.month + '/' + parts.year;
    }
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
      if (onCropChange) {
        onCropChange({ x: posX, y: posY, zoom: zoom }, img ? img.src : null);
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

    function setCrop(crop, src, alt) {
      posX = Number(crop && crop.x) || 50;
      posY = Number(crop && crop.y) || 50;
      zoom = Number(crop && crop.zoom) || 1;
      viewport.innerHTML = '';
      img = document.createElement('img');
      img.src = src;
      img.alt = alt || '';
      img.draggable = false;
      img.onload = function () {
        clampPosition();
        renderCrop();
      };
      if (img.complete) {
        clampPosition();
        renderCrop();
      }
      viewport.appendChild(img);
      controls.hidden = false;
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
        renderCrop();
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
    const rows = Array.from(list.querySelectorAll('.person-row'));

    rows.forEach(function (row) {
      const name = (row.getAttribute('data-name') || '').toLowerCase();
      row.style.display = !query || name.includes(query) ? '' : 'none';
    });

    const visible = rows.filter(function (row) { return row.style.display !== 'none'; });

    visible.sort(function (a, b) {
      return a.getAttribute('data-name').localeCompare(b.getAttribute('data-name'));
    });

    visible.forEach(function (row) {
      list.appendChild(row);
    });

    initLazyPhotos(list);
  }

  function showModal(modalId) {
    if (typeof window.jQuery !== 'undefined') {
      window.jQuery(modalId).modal('show');
    }
  }

  function hideModal(modalId) {
    if (typeof window.jQuery !== 'undefined') {
      window.jQuery(modalId).modal('hide');
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

  async function submitPersonForm(form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
    }

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          Accept: 'application/json',
        },
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
      }
    }
  }

  function getInitials(name) {
    if (!name) {
      return '?';
    }

    return name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (part) { return part[0]; })
      .join('')
      .toUpperCase();
  }

  function createPersonRow(person) {
    const slug = page.getAttribute('data-synagogue-slug');
    const dateLabel = page.getAttribute('data-date-label') || 'Date of death';
    const deleteConfirm = page.getAttribute('data-delete-confirm') || 'Are you sure?';
    const row = document.createElement('article');
    row.className = 'person-row person-row-clickable';
    row.setAttribute('data-name', person.name || '');
    row.setAttribute('data-id', String(person.id));
    row.setAttribute(
      'data-date',
      person.gregorianDateOfDeath.year + '-' + person.gregorianDateOfDeath.month + '-' + person.gregorianDateOfDeath.date,
    );

    if (person.photo) {
      const wrap = document.createElement('span');
      wrap.className = 'person-photo-wrap';
      const img = document.createElement('img');
      img.className = 'person-photo lazy-person-photo';
      img.alt = person.name || '';
      img.decoding = 'async';
      img.setAttribute('data-thumb-src', buildThumbUrl(person.photo));
      img.setAttribute('data-full-src', buildFullUrl(person.photo));
      wrap.appendChild(img);

      const hiddenPlaceholder = document.createElement('span');
      hiddenPlaceholder.className = 'person-photo-placeholder d-none';
      hiddenPlaceholder.setAttribute('aria-hidden', 'true');
      hiddenPlaceholder.textContent = getInitials(person.name);

      row.appendChild(wrap);
      row.appendChild(hiddenPlaceholder);
    } else {
      const placeholder = document.createElement('span');
      placeholder.className = 'person-photo-placeholder';
      placeholder.setAttribute('aria-hidden', 'true');
      placeholder.textContent = getInitials(person.name);
      row.appendChild(placeholder);
    }

    const meta = document.createElement('div');
    meta.className = 'person-meta';
    const strong = document.createElement('strong');
    strong.textContent = person.name || '';
    const small = document.createElement('small');
    const parts = person.gregorianDateOfDeath;
    small.textContent = dateLabel + ': ' + parts.date + '/' + parts.month + '/' + parts.year;
    meta.appendChild(strong);
    meta.appendChild(small);

    row.appendChild(meta);

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn-admin btn-admin-secondary person-row-edit-btn';
    editBtn.setAttribute('data-person-id', String(person.id));
    editBtn.textContent = page.getAttribute('data-edit-label') || 'Edit';
    row.appendChild(editBtn);

    return row;
  }

  function bindPersonRowInteractions(personCard) {
    list.addEventListener('click', function (event) {
      const editBtn = event.target.closest('.person-row-edit-btn');
      if (editBtn) {
        event.preventDefault();
        event.stopPropagation();
        openEditModal(Number(editBtn.getAttribute('data-person-id')));
        return;
      }

      const row = event.target.closest('.person-row-clickable');
      if (!row || !list.contains(row)) {
        return;
      }

      const personId = Number(row.getAttribute('data-id'));
      const person = peopleById[personId];
      if (person && personCard) {
        personCard.openPersonCard(person);
      }
    });
  }

  function syncContactPlatformFields(root) {
    if (!root) {
      return;
    }

    const platformSelect = root.querySelector('.admin-contact-platform');
    const phoneField = root.querySelector('.admin-contact-phone-field');
    const emailField = root.querySelector('.admin-contact-email-field');
    if (!platformSelect || !phoneField || !emailField) {
      return;
    }

    const isEmail = platformSelect.value === 'email';
    phoneField.hidden = isEmail;
    emailField.hidden = !isEmail;
  }

  function initContactPlatformToggles() {
    document.querySelectorAll('.admin-contact-platform').forEach(function (select) {
      const root = select.closest('.modal') || select.closest('form');
      select.addEventListener('change', function () {
        syncContactPlatformFields(root);
      });
      syncContactPlatformFields(root);
    });
  }

  function openEditModal(id) {
    const person = peopleById[id];
    if (!person) {
      return;
    }

    activeEditPersonId = id;
    editListSnapshot = {
      crop: normalizeCrop(person.photoCrop),
      photo: person.photo || null,
    };

    document.getElementById('editId').value = person.id;
    document.getElementById('editName').value = person.name || '';
    document.getElementById('editDate').value = person.gregorianDateOfDeath.date;
    document.getElementById('editMonth').value = person.gregorianDateOfDeath.month;
    document.getElementById('editYear').value = person.gregorianDateOfDeath.year;
    document.getElementById('editText').value = person.text || '';
    document.getElementById('deletePhotoCheck').checked = false;

    const contact = person.contact || {};
    const editContactName = document.getElementById('editContactName');
    const editContactPhone = document.getElementById('editContactPhone');
    const editContactEmail = document.getElementById('editContactEmail');
    const editContactPlatform = document.getElementById('editContactPlatform');
    const editContactGender = document.getElementById('editContactGender');
    if (editContactName) editContactName.value = contact.name || '';
    if (editContactPhone) editContactPhone.value = contact.phone || '';
    if (editContactEmail) editContactEmail.value = contact.email || '';
    if (editContactPlatform) editContactPlatform.value = contact.platform || 'whatsapp';
    if (editContactGender) editContactGender.value = contact.gender || '';
    syncContactPlatformFields(document.getElementById('editPersonModal'));

    if (person.photo) {
      cropEditors.edit.setCrop(
        person.photoCrop || { x: 50, y: 50, zoom: 1 },
        buildFullUrl(person.photo),
        person.name || '',
      );
    } else {
      cropEditors.edit.clearCrop();
    }

    showModal('#editPersonModal');
  }

  function upsertPerson(person) {
    const normalized = Object.assign({}, person, {
      photoCrop: normalizeCrop(person.photoCrop),
    });
    const existingIndex = people.findIndex(function (item) { return item.id === normalized.id; });

    if (existingIndex === -1) {
      people.push(normalized);
    } else {
      people[existingIndex] = normalized;
    }

    peopleById[normalized.id] = normalized;
    syncPeopleData();
    return normalized;
  }

  function initPeoplePage() {
    const personCard = window.AdminPersonCard
      ? window.AdminPersonCard.init({ onEdit: openEditModal })
      : null;

    const editForm = document.querySelector('#editPersonModal form');
    if (editForm) {
      editForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        try {
          const result = await submitPersonForm(editForm);
          const person = upsertPerson(result.person);
          editFormSubmitted = true;
          updateListRowMeta(person);
          updateListRowPhoto(person.id, person.photoCrop, person.photo || null);
          hideModal('#editPersonModal');
        } catch (err) {
          window.alert(err.message || 'Save failed');
        }
      });
    }

    const addForm = document.querySelector('#addPersonModal form');
    if (addForm) {
      addForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        try {
          const result = await submitPersonForm(addForm);
          const person = upsertPerson(result.person);
          const row = createPersonRow(person);
          list.appendChild(row);
          updateListRowPhoto(person.id, person.photoCrop, person.photo || null);
          addForm.reset();
          cropEditors.add.clearCrop();
          hideModal('#addPersonModal');
          applyFilters();
        } catch (err) {
          window.alert(err.message || 'Save failed');
        }
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

    bindPersonRowInteractions(personCard);

    initLazyPhotos(list);
    initEditModalHandlers();
    initContactPlatformToggles();

    window.AdminPeople = {
      openEditModal: openEditModal,
    };

    const editParam = new URLSearchParams(window.location.search).get('edit');
    if (editParam) {
      openEditModal(Number(editParam));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPeoplePage);
  } else {
    initPeoplePage();
  }
})();
