(function () {
  var root = document.getElementById('graveScan');
  if (!root) {
    return;
  }

  var scanUrl = root.dataset.scanUrl;
  var confirmUrl = root.dataset.confirmUrl;
  var loginUrl = root.dataset.loginUrl;
  var preview = document.getElementById('scanPreview');
  var capture = document.getElementById('scanCapture');
  var loading = document.getElementById('scanLoading');
  var review = document.getElementById('scanReview');
  var done = document.getElementById('scanDone');
  var form = document.getElementById('scanForm');
  var alertBox = document.getElementById('scanAlert');
  var confidence = document.getElementById('scanConfidence');
  var matchesBox = document.getElementById('scanMatches');
  var rawWrap = document.getElementById('scanRawWrap');
  var rawText = document.getElementById('scanRaw');
  var previewUrl = '';
  var photoFile = null;

  function show(section) {
    capture.hidden = section !== 'capture';
    loading.hidden = section !== 'loading';
    review.hidden = section !== 'review';
    done.hidden = section !== 'done';
    preview.hidden = !(photoFile && (section === 'loading' || section === 'review'));
  }

  function setAlert(message, ok) {
    if (!message) {
      alertBox.hidden = true;
      alertBox.textContent = '';
      alertBox.classList.remove('is-ok');
      return;
    }
    alertBox.hidden = false;
    alertBox.textContent = message;
    alertBox.classList.toggle('is-ok', !!ok);
  }

  function setField(id, value) {
    var field = document.getElementById(id);
    if (field) {
      field.value = value == null ? '' : String(value);
    }
  }

  function renderMatches(matches) {
    matchesBox.textContent = '';
    if (!matches || !matches.length) {
      matchesBox.hidden = true;
      return;
    }

    matchesBox.hidden = false;
    var title = document.createElement('p');
    title.textContent = 'Такое имя уже есть. Обновить запись?';
    matchesBox.appendChild(title);

    var fresh = document.createElement('label');
    fresh.className = 'scan-match';
    var freshInput = document.createElement('input');
    freshInput.type = 'radio';
    freshInput.name = 'personId';
    freshInput.value = '';
    freshInput.checked = true;
    fresh.appendChild(freshInput);
    fresh.appendChild(document.createTextNode('Новая запись'));
    matchesBox.appendChild(fresh);

    matches.forEach(function (match) {
      var label = document.createElement('label');
      label.className = 'scan-match';
      var input = document.createElement('input');
      input.type = 'radio';
      input.name = 'personId';
      input.value = String(match.id);
      label.appendChild(input);
      var caption = match.name || ('#' + match.id);
      if (match.year) {
        caption += ' · ' + match.year;
      }
      label.appendChild(document.createTextNode(caption));
      matchesBox.appendChild(label);
    });
  }

  function fillForm(data, failed) {
    var fields = data || {};
    var death = fields.gregorianDateOfDeath || {};
    setField('scanName', fields.name || '');
    setField('scanFather', fields.fatherNameOrPatronymic || '');
    setField('scanDay', death.date || '');
    setField('scanMonth', death.month || '');
    setField('scanYear', death.year || '');
    setField('scanHebrew', fields.hebrewDateText || '');
    setField('scanEpitaph', fields.epitaphOrBio || '');
    renderMatches(fields.matches || []);

    if (fields.rawText) {
      rawWrap.hidden = false;
      rawText.textContent = fields.rawText;
    } else {
      rawWrap.hidden = true;
      rawText.textContent = '';
    }

    if (typeof fields.confidence === 'number') {
      confidence.hidden = false;
      confidence.textContent = 'Уверенность чтения: ' + Math.round(fields.confidence * 100) + '%';
    } else {
      confidence.hidden = true;
      confidence.textContent = '';
    }

    if (failed) {
      setAlert(fields.message || 'Не удалось прочитать надпись. Заполните карточку вручную.');
    } else {
      setAlert('Проверьте карточку перед сохранением.', true);
    }
  }

  function resetFlow() {
    photoFile = null;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = '';
    }
    preview.removeAttribute('src');
    form.reset();
    setAlert('');
    renderMatches([]);
    rawWrap.hidden = true;
    confidence.hidden = true;
    Array.prototype.forEach.call(root.querySelectorAll('[data-scan-input]'), function (input) {
      input.value = '';
    });
    show('capture');
  }

  async function readStone() {
    show('loading');
    var body = new FormData();
    body.append('image', photoFile, photoFile.name || 'grave.jpg');
    try {
      var response = await fetch(scanUrl, {
        method: 'POST',
        body: body,
        credentials: 'same-origin',
      });
      if (response.status === 401) {
        window.location.href = loginUrl;
        return;
      }
      var data = await response.json().catch(function () { return {}; });
      fillForm(data, !response.ok || data.ok === false);
      show('review');
    } catch (err) {
      fillForm({ message: 'Нет связи. Заполните карточку вручную.' }, true);
      show('review');
    }
  }

  Array.prototype.forEach.call(root.querySelectorAll('[data-scan-input]'), function (input) {
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) {
        return;
      }
      photoFile = file;
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      previewUrl = URL.createObjectURL(file);
      preview.src = previewUrl;
      readStone();
    });
  });

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (!photoFile) {
      setAlert('Сначала сделайте фото плиты.');
      return;
    }

    var submit = document.getElementById('scanSubmit');
    submit.disabled = true;
    setAlert('Сохраняем…', true);
    var body = new FormData(form);
    body.append('image', photoFile, photoFile.name || 'grave.jpg');

    try {
      var response = await fetch(confirmUrl, {
        method: 'POST',
        body: body,
        credentials: 'same-origin',
      });
      if (response.status === 401) {
        window.location.href = loginUrl;
        return;
      }
      var data = await response.json().catch(function () { return {}; });
      if (!response.ok || data.ok === false) {
        setAlert(data.message || 'Не удалось сохранить запись.');
        submit.disabled = false;
        return;
      }
      document.getElementById('scanDoneName').textContent = (data.person && data.person.name) || '';
      show('done');
    } catch (err) {
      setAlert('Нет связи. Попробуйте сохранить ещё раз.');
      submit.disabled = false;
    }
  });

  document.getElementById('scanRetake').addEventListener('click', resetFlow);
  document.getElementById('scanAgain').addEventListener('click', resetFlow);
  show('capture');
})();
