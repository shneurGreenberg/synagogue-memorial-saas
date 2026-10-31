(function () {
  const page = document.querySelector('.yahrzeit-page');

  document.querySelectorAll('.yahrzeit-copy-btn').forEach(function (button) {
    button.addEventListener('click', async function (event) {
      event.stopPropagation();
      const copiedLabel = page ? page.getAttribute('data-copied-label') : 'Copied!';
      const copyLabel = page ? page.getAttribute('data-copy-label') : 'Copy';
      const block = button.closest('.yahrzeit-message-block') || button.closest('.yahrzeit-card');
      const textarea = block ? block.querySelector('.yahrzeit-message') : null;
      saveEditedMessage(textarea);
      const message = (textarea && textarea.value) || button.getAttribute('data-message') || '';

      try {
        await navigator.clipboard.writeText(message);
        const original = button.textContent;
        button.textContent = copiedLabel;
        window.setTimeout(function () {
          button.textContent = original || copyLabel;
        }, 1800);
      } catch (err) {
        if (textarea) {
          textarea.focus();
          textarea.select();
          document.execCommand('copy');
        }
      }
    });
  });

  /* 1.31.0 I23: the message is editable; an edited text is saved as the community template
   * (server turns it into gender-neutral form) and the send link is rebuilt with the edited text. */
  function saveEditedMessage(textarea) {
    if (!textarea || !page) return Promise.resolve(null);
    if (textarea.value === textarea.defaultValue) return Promise.resolve(null);
    var slug = page.getAttribute('data-synagogue-slug');
    return fetch('/admin/' + slug + '/yahrzeit/message-template', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        personId: textarea.getAttribute('data-person-id'),
        contactIndex: textarea.getAttribute('data-contact-index'),
        missed: textarea.getAttribute('data-missed') === '1',
        message: textarea.value,
      }),
    }).then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      if (data && data.ok) textarea.defaultValue = textarea.value;
      return data;
    }).catch(function () { return null; });
  }

  document.querySelectorAll('.yahrzeit-message').forEach(function (textarea) {
    textarea.addEventListener('change', function () { saveEditedMessage(textarea); });
  });

  document.querySelectorAll('.yahrzeit-send-btn').forEach(function (button) {
    button.addEventListener('click', async function (event) {
      event.preventDefault();
      var block = button.closest('.yahrzeit-message-block');
      var textarea = block ? block.querySelector('.yahrzeit-message') : null;
      var edited = textarea && textarea.value !== textarea.defaultValue;
      var saved = edited ? await saveEditedMessage(textarea) : null;
      if (saved && saved.contactLink) button.setAttribute('href', saved.contactLink);
      var exportUrl = button.getAttribute('data-export-url');
      var personName = button.getAttribute('data-person-name') || '';
      var contactLink = button.getAttribute('href');
      if (!window.AdminTileCapture) {
        if (contactLink) window.open(contactLink, '_blank', 'noopener,noreferrer');
        return;
      }

      window.AdminTileCapture.captureBoardCardPng(exportUrl).then(function (dataUrl) {
        window.AdminTileCapture.downloadDataUrl(dataUrl, personName);
      }).catch(function () {
        /* skip image when capture fails */
      }).finally(function () {
        if (contactLink) {
          window.open(contactLink, '_blank', 'noopener,noreferrer');
        }
      });
    });
  });

  function personIdKey(id) {
    return String(id);
  }

  function initYahrzeitPersonCards() {
    const dataEl = document.getElementById('yahrzeit-people-data');
    if (!page || !dataEl || !window.AdminPersonCard) {
      return null;
    }

    const peopleById = {};
    try {
      JSON.parse(dataEl.textContent).forEach(function (person) {
        peopleById[personIdKey(person.id)] = person;
      });
    } catch (err) {
      return null;
    }

    const personCard = window.AdminPersonCard.init({
      onEdit: function (personId) {
        const slug = page.getAttribute('data-synagogue-slug');
        if (slug && personId != null) {
          window.location.href = '/admin/' + slug + '/people?edit=' + personId;
        }
      },
    });

    if (!personCard) {
      return null;
    }

    function openPersonById(personId) {
      const person = peopleById[personIdKey(personId)];
      if (person) {
        personCard.openPersonCard(person);
      }
    }

    document.querySelectorAll('.yahrzeit-card-clickable .yahrzeit-card-open').forEach(function (target) {
      target.addEventListener('click', function () {
        const card = target.closest('.yahrzeit-card-clickable');
        const personId = card && card.getAttribute('data-person-id');
        openPersonById(personId);
      });
    });

    return { openPersonById: openPersonById };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initYahrzeitPersonCards);
  } else {
    initYahrzeitPersonCards();
  }
})();

(function yahrzeitSettingsAutoSave() {
  const form = document.querySelector('.yahrzeit-settings-form');
  const page = document.querySelector('.yahrzeit-page');
  if (!form || !page) {
    return;
  }
  const indicator = document.getElementById('yahrzeitSettingsSaved');
  const slug = page.getAttribute('data-synagogue-slug');
  if (!slug) {
    return;
  }

  let saveTimer = null;
  let flashTimer = null;

  function showSaved() {
    if (!indicator) {
      return;
    }
    indicator.hidden = false;
    indicator.textContent = indicator.getAttribute('data-saved-label') || 'Saved';
    if (flashTimer) {
      window.clearTimeout(flashTimer);
    }
    flashTimer = window.setTimeout(function () {
      indicator.hidden = true;
    }, 2200);
  }

  function revertInput(input, previous) {
    if (!input) {
      return;
    }
    if (input.type === 'checkbox') {
      input.checked = previous;
      return;
    }
    input.value = previous;
  }

  async function persistSetting(input, previousValue) {
    const body = new URLSearchParams(new FormData(form));
    try {
      const response = await fetch(form.getAttribute('action') || ('/admin/' + slug + '/yahrzeit/settings'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'fetch',
        },
        body: body.toString(),
        credentials: 'same-origin',
      });
      if (!response.ok) {
        throw new Error('save_failed');
      }
      const payload = await response.json();
      if (!payload || payload.ok !== true) {
        throw new Error('save_failed');
      }
      showSaved();
    } catch (err) {
      revertInput(input, previousValue);
    }
  }

  function scheduleSave(input, previousValue) {
    if (saveTimer) {
      window.clearTimeout(saveTimer);
    }
    saveTimer = window.setTimeout(function () {
      persistSetting(input, previousValue);
    }, 120);
  }

  form.querySelectorAll('input, select, textarea').forEach(function (input) {
    if (input.type === 'checkbox') {
      input.addEventListener('change', function () {
        scheduleSave(input, !input.checked);
      });
      return;
    }
    input.addEventListener('focus', function () {
      input.dataset.prevValue = input.value;
    });
    input.addEventListener('change', function () {
      scheduleSave(input, input.dataset.prevValue);
    });
  });
})();

(function weeklyKaddishSend() {
    const btn = document.getElementById('weeklyKaddishSend');
    const textEl = document.getElementById('weeklyKaddishMessage');
    if (!btn || !textEl) return;
    btn.addEventListener('click', async () => {
        const url = btn.dataset.waUrl;
        if (url) {
            window.open(url, '_blank', 'noopener');
            return;
        }
        const text = textEl.value;
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            textEl.hidden = false;
            textEl.select();
            document.execCommand('copy');
        }
        alert(btn.dataset.copiedLabel);
        const input = document.getElementById('weeklyKaddishWhatsapp');
        if (input) { input.scrollIntoView({ behavior: 'smooth', block: 'center' }); input.focus(); }
    });
}());
