(function () {
  const page = document.querySelector('.yahrzeit-page');

  document.querySelectorAll('.yahrzeit-copy-btn').forEach(function (button) {
    button.addEventListener('click', async function (event) {
      event.stopPropagation();
      const copiedLabel = page ? page.getAttribute('data-copied-label') : 'Copied!';
      const copyLabel = page ? page.getAttribute('data-copy-label') : 'Copy';
      const card = button.closest('.yahrzeit-card');
      const textarea = card ? card.querySelector('.yahrzeit-message') : null;
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

  document.querySelectorAll('.yahrzeit-send-btn').forEach(function (button) {
    button.addEventListener('click', function (event) {
      if (!window.AdminTileCapture) {
        return;
      }

      event.preventDefault();
      var exportUrl = button.getAttribute('data-export-url');
      var personName = button.getAttribute('data-person-name') || '';
      var contactLink = button.getAttribute('href');

      window.AdminTileCapture.captureBoardTilePng(exportUrl).then(function (dataUrl) {
        window.AdminTileCapture.downloadDataUrl(dataUrl, personName);
      }).catch(function () {
        /* still open the contact app even if capture fails */
      }).finally(function () {
        if (contactLink) {
          window.open(contactLink, '_blank', 'noopener,noreferrer');
        }
      });
    });
  });

  const dataEl = document.getElementById('yahrzeit-people-data');
  if (!page || !dataEl || !window.AdminPersonCard) {
    return;
  }

  const peopleById = {};
  try {
    JSON.parse(dataEl.textContent).forEach(function (person) {
      peopleById[person.id] = person;
    });
  } catch (err) {
    return;
  }

  const personCard = window.AdminPersonCard.init({
    onEdit: function (personId) {
      const slug = page.getAttribute('data-synagogue-slug');
      if (slug && personId != null) {
        window.location.href = '/admin/' + slug + '/people?edit=' + personId;
      }
    },
  });

  document.querySelectorAll('.yahrzeit-card-clickable .yahrzeit-card-open').forEach(function (target) {
    target.addEventListener('click', function () {
      const card = target.closest('.yahrzeit-card-clickable');
      const personId = Number(card && card.getAttribute('data-person-id'));
      const person = peopleById[personId];
      if (person && personCard) {
        personCard.openPersonCard(person);
      }
    });
  });
})();
