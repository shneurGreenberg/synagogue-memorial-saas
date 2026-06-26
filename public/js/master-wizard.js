(function () {
  var STEP_META = [
    { id: 'basics', labelKey: 'wizard_step_basics_title', required: true },
    { id: 'languages', labelKey: 'wizard_step_languages_title' },
    { id: 'location', labelKey: 'wizard_step_location_title' },
    { id: 'logo', labelKey: 'wizard_step_logo_title' },
    { id: 'donation', labelKey: 'wizard_step_donation_title' },
    { id: 'appearance', labelKey: 'wizard_step_appearance_title' },
    { id: 'features', labelKey: 'wizard_step_features_title' },
    { id: 'contacts', labelKey: 'wizard_step_contacts_title' },
    { id: 'photos', labelKey: 'wizard_step_photos_title' },
    { id: 'yahrzeit', labelKey: 'wizard_step_yahrzeit_title' },
    { id: 'review', labelKey: 'wizard_step_review_title' },
  ];

  function getLabels() {
    var node = document.getElementById('masterWizardLabels');
    if (!node) return {};
    try {
      return JSON.parse(node.textContent || '{}');
    } catch (err) {
      return {};
    }
  }

  function label(labels, key, fallback) {
    return labels[key] || fallback || key;
  }

  function Wizard(form) {
    this.form = form;
    this.cards = Array.prototype.slice.call(form.querySelectorAll('.master-wizard-card'));
    this.stepsEl = document.querySelector('.master-wizard-steps');
    this.progressBar = document.querySelector('.master-wizard-progress-bar');
    this.backBtn = document.getElementById('wizardBackBtn');
    this.skipBtn = document.getElementById('wizardSkipBtn');
    this.nextBtn = document.getElementById('wizardNextBtn');
    this.submitBtn = document.getElementById('wizardSubmitBtn');
    this.skippedInput = document.getElementById('wizardSkippedSteps');
    this.reviewEl = document.getElementById('wizardReviewSummary');
    this.labels = getLabels();
    this.skipped = new Set();
    this.index = 0;
  }

  Wizard.prototype.init = function () {
    var self = this;
    this.renderStepIndicators();
    this.showStep(0);

    this.backBtn.addEventListener('click', function () {
      self.go(-1);
    });
    this.skipBtn.addEventListener('click', function () {
      self.skipCurrent();
    });
    this.nextBtn.addEventListener('click', function () {
      self.go(1);
    });

    var logoInput = document.getElementById('wizardLogo');
    if (logoInput) {
      logoInput.addEventListener('change', function () {
        self.previewImage(logoInput, 'wizardLogoPreview');
      });
    }

    var contactInput = document.getElementById('wizardContactFiles');
    if (contactInput) {
      contactInput.addEventListener('change', function () {
        self.renderFileList(contactInput, 'wizardContactFileList');
      });
    }

    var nameInput = document.getElementById('wizardName');
    var slugInput = document.getElementById('wizardSlug');
    if (nameInput && slugInput) {
      nameInput.addEventListener('blur', function () {
        if (!slugInput.value.trim() && window.masterSlugFromName) {
          slugInput.value = window.masterSlugFromName(nameInput.value);
        }
      });
    }
  };

  Wizard.prototype.currentCard = function () {
    return this.cards[this.index];
  };

  Wizard.prototype.currentStepId = function () {
    var card = this.currentCard();
    return card ? card.dataset.step : '';
  };

  Wizard.prototype.renderStepIndicators = function () {
    var self = this;
    if (!this.stepsEl) return;
    this.stepsEl.innerHTML = '';
    STEP_META.forEach(function (step, stepIndex) {
      var item = document.createElement('li');
      item.className = 'master-wizard-step-item';
      item.dataset.index = String(stepIndex);
      item.textContent = label(self.labels, step.labelKey, step.id);
      self.stepsEl.appendChild(item);
    });
  };

  Wizard.prototype.updateIndicators = function () {
    var items = this.stepsEl ? this.stepsEl.querySelectorAll('.master-wizard-step-item') : [];
    Array.prototype.forEach.call(items, function (item, itemIndex) {
      item.classList.toggle('is-active', itemIndex === this.index);
      item.classList.toggle('is-done', itemIndex < this.index);
      item.classList.toggle('is-skipped', this.skipped.has(STEP_META[itemIndex].id));
    }, this);

    if (this.progressBar) {
      var pct = ((this.index + 1) / STEP_META.length) * 100;
      this.progressBar.style.width = pct + '%';
    }
  };

  Wizard.prototype.validateCurrent = function () {
    var card = this.currentCard();
    if (!card || card.dataset.required !== 'true') {
      return true;
    }

    var requiredFields = card.querySelectorAll('input, select, textarea');
    for (var i = 0; i < requiredFields.length; i += 1) {
      var field = requiredFields[i];
      if (!field.required) continue;
      if (!String(field.value || '').trim()) {
        field.focus();
        field.reportValidity();
        return false;
      }
    }

    return true;
  };

  Wizard.prototype.showStep = function (nextIndex) {
    var self = this;
    this.index = Math.max(0, Math.min(nextIndex, this.cards.length - 1));
    this.cards.forEach(function (card, cardIndex) {
      var active = cardIndex === self.index;
      card.hidden = !active;
      card.classList.toggle('is-active', active);
    });

    var step = STEP_META[this.index];
    var isFirst = this.index === 0;
    var isReview = step.id === 'review';

    this.backBtn.hidden = isFirst;
    this.skipBtn.hidden = step.required || isReview;
    this.nextBtn.hidden = isReview;
    this.submitBtn.hidden = !isReview;

    if (isReview) {
      this.renderReview();
    }

    if (step.id === 'location') {
      var picker = this.form._locationPicker;
      if (picker) {
        picker.init();
        setTimeout(function () {
          if (picker.map) picker.map.invalidateSize();
        }, 200);
      }
    }

    this.updateIndicators();
  };

  Wizard.prototype.go = function (delta) {
    if (delta > 0 && !this.validateCurrent()) {
      return;
    }

    var next = this.index + delta;
    if (next >= 0 && next < this.cards.length) {
      var leaving = STEP_META[this.index];
      if (delta > 0 && !leaving.required) {
        this.skipped.delete(leaving.id);
      }
      this.persistSkipped();
      this.showStep(next);
    }
  };

  Wizard.prototype.skipCurrent = function () {
    var step = STEP_META[this.index];
    if (step.required) return;
    this.skipped.add(step.id);
    this.persistSkipped();
    this.showStep(this.index + 1);
  };

  Wizard.prototype.persistSkipped = function () {
    if (this.skippedInput) {
      this.skippedInput.value = JSON.stringify(Array.from(this.skipped));
    }
  };

  Wizard.prototype.previewImage = function (input, previewId) {
    var preview = document.getElementById(previewId);
    if (!preview || !input.files || !input.files[0]) {
      if (preview) preview.hidden = true;
      return;
    }

    var img = preview.querySelector('img');
    img.src = URL.createObjectURL(input.files[0]);
    preview.hidden = false;
  };

  Wizard.prototype.renderFileList = function (input, listId) {
    var list = document.getElementById(listId);
    if (!list) return;
    list.innerHTML = '';
    if (!input.files || !input.files.length) {
      list.hidden = true;
      return;
    }

    Array.prototype.forEach.call(input.files, function (file) {
      var item = document.createElement('li');
      item.textContent = file.name;
      list.appendChild(item);
    });
    list.hidden = false;
  };

  Wizard.prototype.fieldValue = function (name) {
    var field = this.form.querySelector('[name="' + name + '"]');
    if (!field) return '';
    if (field.type === 'checkbox') return field.checked ? label(this.labels, 'wizard_yes', 'Yes') : label(this.labels, 'wizard_no', 'No');
    if (field.type === 'file') {
      if (!field.files || !field.files.length) return label(this.labels, 'wizard_not_added', 'Not added');
      return Array.prototype.map.call(field.files, function (file) { return file.name; }).join(', ');
    }
    return String(field.value || '').trim() || label(this.labels, 'wizard_not_set', 'Not set');
  };

  Wizard.prototype.renderReview = function () {
    if (!this.reviewEl) return;
    var self = this;
    var rows = [
      ['wizard_review_name', 'name'],
      ['wizard_review_slug', 'slug'],
      ['wizard_review_language', 'language'],
      ['wizard_review_city', 'city'],
      ['wizard_review_donation', 'donationUrl'],
      ['wizard_review_photos_drive', 'photosDriveUrl'],
      ['wizard_review_yahrzeit_email', 'yahrzeitNotifyEmail'],
    ];

    this.reviewEl.innerHTML = '';
    rows.forEach(function (row) {
      var dt = document.createElement('dt');
      dt.textContent = label(self.labels, row[0], row[0]);
      var dd = document.createElement('dd');
      dd.textContent = self.fieldValue(row[1]);
      self.reviewEl.appendChild(dt);
      self.reviewEl.appendChild(dd);
    });

    var skipped = document.createElement('p');
    skipped.className = 'master-wizard-review-skipped';
    if (this.skipped.size) {
      skipped.textContent = label(self.labels, 'wizard_review_skipped', 'Skipped steps') + ': '
        + Array.from(this.skipped).join(', ');
    } else {
      skipped.textContent = label(self.labels, 'wizard_review_none_skipped', 'No steps were skipped.');
    }
    this.reviewEl.appendChild(skipped);
  };

  function initWizard() {
    var form = document.getElementById('masterWizardForm');
    if (!form) return;
    var wizard = new Wizard(form);
    wizard.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWizard);
  } else {
    initWizard();
  }
})();
