(function () {
  function readLabels() {
    const page = document.querySelector('.people-page, .yahrzeit-page');
    return {
      dateLabel: (page && page.getAttribute('data-date-label')) || 'Date of death',
      deleteConfirm: (page && page.getAttribute('data-delete-confirm')) || 'Are you sure?',
      noBio: (page && page.getAttribute('data-no-bio-label')) || 'No biography added.',
      sendLabel: (page && page.getAttribute('data-send-label')) || 'Send',
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

  function getPersonContactList(person) {
    if (!person) {
      return [];
    }

    if (Array.isArray(person.contacts) && person.contacts.length) {
      return person.contacts;
    }

    const legacy = person.contact || {};
    if (legacy.name || legacy.phone || legacy.email) {
      return [legacy];
    }

    return [];
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
    const contactNoContact = document.getElementById('personCardNoContact');
    const contactsList = document.getElementById('personCardContactsList');
    const sendActions = document.getElementById('personCardSendActions');
    const editBtn = document.getElementById('personCardEditBtn');
    const deleteBtn = document.getElementById('personCardDeleteBtn');
    const deleteForm = document.getElementById('personCardDeleteForm');
    const deleteIdInput = document.getElementById('personCardDeleteId');
    const page = document.querySelector('.people-page, .yahrzeit-page');
    const synagogueSlug = page ? page.getAttribute('data-synagogue-slug') : '';
    let activePerson = null;

    function renderContactBlock(contact, index) {
      const block = document.createElement('div');
      block.className = 'admin-person-card-contact-block';

      const title = document.createElement('h4');
      title.textContent = contact.name || (labels.sendLabel + ' ' + (index + 1));
      block.appendChild(title);

      function addRow(label, value) {
        if (!value) {
          return;
        }

        const row = document.createElement('p');
        const strong = document.createElement('strong');
        strong.textContent = label + ':';
        row.appendChild(strong);
        row.appendChild(document.createTextNode(' ' + value));
        block.appendChild(row);
      }

      addRow('Phone', contact.phone);
      addRow('Email', contact.email);

      const platform = String(contact.platform || '').trim();
      if (platform && (contact.phone || contact.email)) {
        addRow('Platform', labels.platformLabels[platform] || platform);
      }

      return block;
    }

    function createSendButton(person, contactIndex, contactName, contactLink) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn-admin btn-admin-primary btn-admin-with-icon';
      button.textContent = contactName
        ? labels.sendLabel + ' — ' + contactName
        : labels.sendLabel;

      button.addEventListener('click', function () {
        downloadTileImage(person).finally(function () {
          window.open(contactLink, '_blank', 'noopener,noreferrer');
        });
      });

      return button;
    }

    function downloadTileImage(person) {
      if (!window.AdminTileCapture || !synagogueSlug || !person || person.id == null) {
        return Promise.resolve();
      }

      return window.AdminTileCapture.downloadBoardCardImage(
        synagogueSlug,
        person.id,
        person.name,
      ).catch(function () {
        /* skip image when capture fails */
      });
    }

    function populateContacts(person) {
      const contacts = getPersonContactList(person);
      if (contactsList) {
        contactsList.innerHTML = '';
      }
      if (sendActions) {
        sendActions.innerHTML = '';
      }

      if (contactNoContact) {
        contactNoContact.hidden = contacts.length > 0;
      }

      contacts.forEach(function (contact, index) {
        if (contactsList) {
          contactsList.appendChild(renderContactBlock(contact, index));
        }

        const platform = String(contact.platform || '').trim();
        const canSend = !!platform && !!(contact.phone || contact.email);
        if (!canSend || !sendActions || !synagogueSlug || !person || person.id == null) {
          return;
        }

        fetch('/admin/' + encodeURIComponent(synagogueSlug) + '/people/message/' + encodeURIComponent(person.id) + '.json?contactIndex=' + encodeURIComponent(index))
          .then(function (response) { return response.json(); })
          .then(function (payload) {
            if (!payload || !payload.ok || !payload.canSend || !payload.contactLink) {
              return;
            }

            sendActions.appendChild(createSendButton(
              person,
              index,
              payload.contactName || contact.name || '',
              payload.contactLink,
            ));
          })
          .catch(function () {});
      });
    }

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

      if (contactSection) {
        contactSection.hidden = false;
      }

      populateContacts(person);

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

    function closePersonCardModal(callback) {
      const $modal = window.jQuery('#personCardModal');
      if (!$modal.length) {
        if (typeof callback === 'function') {
          callback();
        }
        return;
      }

      if (editBtn && document.activeElement === editBtn) {
        editBtn.blur();
      }

      if (!$modal.hasClass('show')) {
        if (typeof callback === 'function') {
          callback();
        }
        return;
      }

      $modal.one('hidden.bs.modal', function () {
        if (typeof callback === 'function') {
          callback();
        }
      });
      $modal.modal('hide');
    }

    if (editBtn) {
      editBtn.addEventListener('click', function () {
        if (!activePerson) {
          return;
        }

        const person = activePerson;
        closePersonCardModal(function () {
          const personId = person && person.id;
          if (personId == null) {
            return;
          }

          if (typeof options.onEdit === 'function') {
            options.onEdit(personId);
          } else if (window.AdminPeople && typeof window.AdminPeople.openEditModal === 'function') {
            window.AdminPeople.openEditModal(personId);
          }
        });
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
