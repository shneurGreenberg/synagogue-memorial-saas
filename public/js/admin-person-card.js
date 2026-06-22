(function () {
  function readLabels() {
    const page = document.querySelector('.people-page, .yahrzeit-page');
    return {
      dateLabel: (page && page.getAttribute('data-date-label')) || 'Date of death',
      deleteConfirm: (page && page.getAttribute('data-delete-confirm')) || 'Are you sure?',
      noBio: (page && page.getAttribute('data-no-bio-label')) || 'No biography added.',
      platformLabels: {
        whatsapp: (page && page.getAttribute('data-platform-whatsapp')) || 'WhatsApp',
        telegram: (page && page.getAttribute('data-platform-telegram')) || 'Telegram',
        max: (page && page.getAttribute('data-platform-max')) || 'MAX',
        sms: (page && page.getAttribute('data-platform-sms')) || 'SMS',
        email: (page && page.getAttribute('data-platform-email')) || 'Email',
      },
    };
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

  function formatDateLabel(person, dateLabel) {
    const parts = person && person.gregorianDateOfDeath;
    if (!parts) {
      return '';
    }

    return dateLabel + ': ' + parts.date + '/' + parts.month + '/' + parts.year;
  }

  function setRowVisibility(row, visible, text) {
    if (!row) {
      return;
    }

    row.hidden = !visible;
    const span = row.querySelector('span');
    if (span) {
      span.textContent = text || '';
    }
  }

  function initAdminPersonCard(options) {
    options = options || {};
    const modal = document.getElementById('personCardModal');
    if (!modal || typeof window.jQuery === 'undefined') {
      return null;
    }

    const labels = readLabels();
    const photo = document.getElementById('personCardPhoto');
    const placeholder = document.getElementById('personCardPlaceholder');
    const nameEl = document.getElementById('personCardName');
    const datesEl = document.getElementById('personCardDates');
    const bioEl = document.getElementById('personCardBio');
    const contactSection = document.getElementById('personCardContactSection');
    const contactNameRow = document.getElementById('personCardContactName');
    const contactPhoneRow = document.getElementById('personCardContactPhone');
    const contactEmailRow = document.getElementById('personCardContactEmail');
    const contactPlatformRow = document.getElementById('personCardContactPlatform');
    const editBtn = document.getElementById('personCardEditBtn');
    const deleteBtn = document.getElementById('personCardDeleteBtn');
    const deleteForm = document.getElementById('personCardDeleteForm');
    const deleteIdInput = document.getElementById('personCardDeleteId');
    let activePerson = null;

    function populateCard(person) {
      activePerson = person;
      const hasPhoto = !!(person && person.photo);
      const thumbSrc = hasPhoto
        ? '/photos/' + encodeURIComponent(person.photo) + '?w=400'
        : '';

      if (photo) {
        photo.classList.toggle('d-none', !hasPhoto);
        if (hasPhoto) {
          photo.src = thumbSrc;
          photo.alt = person.name || '';
        }
      }

      if (placeholder) {
        placeholder.classList.toggle('d-none', hasPhoto);
        placeholder.textContent = getInitials(person && person.name);
      }

      if (nameEl) {
        nameEl.textContent = (person && person.name) || '';
      }

      if (datesEl) {
        datesEl.textContent = formatDateLabel(person, labels.dateLabel);
      }

      if (bioEl) {
        const text = String((person && person.text) || '').trim();
        bioEl.textContent = text || labels.noBio;
      }

      const contact = (person && person.contact) || {};
      const hasContact = !!(contact.name || contact.phone || contact.email);
      if (contactSection) {
        contactSection.hidden = !hasContact;
      }

      setRowVisibility(contactNameRow, !!contact.name, contact.name);
      setRowVisibility(contactPhoneRow, !!contact.phone, contact.phone);
      setRowVisibility(contactEmailRow, !!contact.email, contact.email);
      setRowVisibility(
        contactPlatformRow,
        !!contact.platform,
        labels.platformLabels[contact.platform] || contact.platform,
      );

      if (deleteIdInput) {
        deleteIdInput.value = person && person.id != null ? String(person.id) : '';
      }
    }

    function openPersonCard(person) {
      if (!person) {
        return;
      }

      populateCard(person);
      window.jQuery('#personCardModal').modal('show');
    }

    if (editBtn) {
      editBtn.addEventListener('click', function () {
        if (!activePerson) {
          return;
        }

        window.jQuery('#personCardModal').modal('hide');
        if (typeof options.onEdit === 'function') {
          options.onEdit(activePerson);
        } else if (window.AdminPeople && typeof window.AdminPeople.openEditModal === 'function') {
          window.AdminPeople.openEditModal(activePerson.id);
        }
      });
    }

    if (deleteBtn && deleteForm) {
      deleteBtn.addEventListener('click', function () {
        if (!activePerson || !window.confirm(labels.deleteConfirm)) {
          return;
        }

        deleteForm.submit();
      });
    }

    return {
      openPersonCard: openPersonCard,
    };
  }

  window.AdminPersonCard = {
    init: initAdminPersonCard,
  };
})();
