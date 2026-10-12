(function () {
  var STEP_IDS = ['basics', 'location', 'logo', 'contact', 'review'];
  var DEFAULT_LAT = 31.7683;
  var DEFAULT_LNG = 35.2137;
  var DEFAULT_ZOOM = 6;
  var DEBOUNCE_MS = 320;

  function getConfig() {
    var node = document.getElementById('onboardingConfig');
    if (!node) return {};
    try {
      return JSON.parse(node.textContent || '{}');
    } catch (err) {
      return {};
    }
  }

  function debounce(fn, ms) {
    var timer;
    return function () {
      var self = this;
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(self, args);
      }, ms);
    };
  }

  function slugFromName(name) {
    return String(name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64);
  }

  function OnboardingLocationPicker(form, token) {
    this.form = form;
    this.token = token;
    this.searchInput = document.getElementById('onboardingPlaceSearch');
    this.resultsEl = document.getElementById('onboardingPlaceResults');
    this.cityInput = document.getElementById('onboardingCity');
    this.latInput = document.getElementById('onboardingLat');
    this.lngInput = document.getElementById('onboardingLong');
    this.timezoneInput = document.getElementById('onboardingTimezone');
    this.timezoneDisplay = document.getElementById('onboardingTimezoneDisplay');
    this.mapEl = document.getElementById('onboardingMap');
    this.map = null;
    this.marker = null;
    this.initialized = false;
  }

  OnboardingLocationPicker.prototype.init = function () {
    if (this.initialized || !this.mapEl || typeof L === 'undefined') {
      return;
    }

    var lat = parseFloat(this.latInput && this.latInput.value);
    var lng = parseFloat(this.lngInput && this.lngInput.value);
    if (!Number.isFinite(lat)) lat = DEFAULT_LAT;
    if (!Number.isFinite(lng)) lng = DEFAULT_LNG;

    this.setCoordinates(lat, lng, this.cityInput ? this.cityInput.value : '', this.timezoneInput ? this.timezoneInput.value : '');

    this.map = L.map(this.mapEl, { scrollWheelZoom: true }).setView([lat, lng], DEFAULT_ZOOM);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.map);

    this.marker = L.marker([lat, lng], { draggable: true }).addTo(this.map);
    var self = this;

    this.marker.on('dragend', function () {
      var pos = self.marker.getLatLng();
      self.setCoordinates(pos.lat, pos.lng, self.cityInput ? self.cityInput.value : '', '');
    });

    this.map.on('click', function (event) {
      self.marker.setLatLng(event.latlng);
      self.setCoordinates(event.latlng.lat, event.latlng.lng, self.cityInput ? self.cityInput.value : '', '');
    });

    if (this.searchInput) {
      this.searchInput.addEventListener('input', debounce(function () {
        self.searchPlaces(self.searchInput.value);
      }, DEBOUNCE_MS));
    }

    document.addEventListener('click', function (event) {
      if (!self.form.contains(event.target) && self.resultsEl) {
        self.resultsEl.hidden = true;
      }
    });

    this.initialized = true;
    setTimeout(function () {
      if (self.map) self.map.invalidateSize();
    }, 200);
  };

  OnboardingLocationPicker.prototype.setCoordinates = function (lat, lng, city, timezone) {
    if (this.latInput) this.latInput.value = Number(lat).toFixed(6);
    if (this.lngInput) this.lngInput.value = Number(lng).toFixed(6);
    if (city && this.cityInput) this.cityInput.value = city;
    if (timezone && this.timezoneInput) {
      this.timezoneInput.value = timezone;
      if (this.timezoneDisplay) this.timezoneDisplay.value = timezone;
    }

    if (this.marker) this.marker.setLatLng([lat, lng]);
    if (this.map) this.map.setView([lat, lng], this.map.getZoom() || DEFAULT_ZOOM);
  };

  OnboardingLocationPicker.prototype.applyPlace = function (place) {
    if (!place) return;
    if (this.searchInput) this.searchInput.value = place.label || place.city || '';
    this.setCoordinates(place.lat, place.lng, place.city || place.label, place.timezone || '');
    if (this.resultsEl) this.resultsEl.hidden = true;
  };

  OnboardingLocationPicker.prototype.searchPlaces = function (query) {
    var self = this;
    var q = String(query || '').trim();
    if (!this.resultsEl) return;

    if (q.length < 2) {
      this.resultsEl.innerHTML = '';
      this.resultsEl.hidden = true;
      return;
    }

    var url = '/join/api/places?q=' + encodeURIComponent(q) + '&token=' + encodeURIComponent(this.token);
    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (items) {
        self.resultsEl.innerHTML = '';
        if (!items || !items.length) {
          self.resultsEl.innerHTML = '<li class="onboarding-place-empty">—</li>';
          self.resultsEl.hidden = false;
          return;
        }

        items.forEach(function (item) {
          var li = document.createElement('li');
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'onboarding-place-option';
          btn.textContent = item.label;
          btn.addEventListener('click', function () {
            self.applyPlace(item);
          });
          li.appendChild(btn);
          self.resultsEl.appendChild(li);
        });
        self.resultsEl.hidden = false;
      })
      .catch(function () {
        self.resultsEl.innerHTML = '<li class="onboarding-place-empty">—</li>';
        self.resultsEl.hidden = false;
      });
  };

  function Wizard(form, config) {
    this.form = form;
    this.config = config || {};
    this.cards = Array.prototype.slice.call(form.querySelectorAll('.master-wizard-card'));
    this.stepsEl = document.getElementById('onboardingSteps');
    this.progressBar = document.getElementById('onboardingProgressBar');
    this.backBtn = document.getElementById('onboardingBackBtn');
    this.nextBtn = document.getElementById('onboardingNextBtn');
    this.submitBtn = document.getElementById('onboardingSubmitBtn');
    this.reviewEl = document.getElementById('onboardingReview');
    this.index = 0;
    this.stepLabels = config.stepLabels || {};
  }

  Wizard.prototype.stepLabel = function (id) {
    return this.stepLabels[id] || id;
  };

  Wizard.prototype.init = function () {
    var self = this;
    this.renderStepIndicators();
    this.showStep(0);

    this.backBtn.addEventListener('click', function () { self.go(-1); });
    this.nextBtn.addEventListener('click', function () { self.go(1); });

    var nameInput = document.getElementById('onboardingName');
    var slugInput = document.getElementById('onboardingSlug');
    if (nameInput && slugInput) {
      nameInput.addEventListener('blur', function () {
        if (!slugInput.value.trim()) {
          slugInput.value = slugFromName(nameInput.value);
        }
      });
      slugInput.addEventListener('blur', function () {
        slugInput.value = slugFromName(slugInput.value);
      });
    }

    var logoInput = document.getElementById('onboardingLogo');
    if (logoInput) {
      logoInput.addEventListener('change', function () {
        self.previewLogo(logoInput);
      });
    }

    var picker = new OnboardingLocationPicker(this.form, this.config.token || '');
    this.form._locationPicker = picker;
  };

  Wizard.prototype.renderStepIndicators = function () {
    var self = this;
    if (!this.stepsEl) return;
    this.stepsEl.innerHTML = '';
    STEP_IDS.forEach(function (id, stepIndex) {
      var item = document.createElement('li');
      item.className = 'master-wizard-step-item';
      item.dataset.index = String(stepIndex);
      item.textContent = self.stepLabel(id);
      self.stepsEl.appendChild(item);
    });
  };

  Wizard.prototype.updateIndicators = function () {
    var items = this.stepsEl ? this.stepsEl.querySelectorAll('.master-wizard-step-item') : [];
    var self = this;
    Array.prototype.forEach.call(items, function (item, itemIndex) {
      item.classList.toggle('is-active', itemIndex === self.index);
      item.classList.toggle('is-done', itemIndex < self.index);
    });

    if (this.progressBar) {
      var pct = ((this.index + 1) / STEP_IDS.length) * 100;
      this.progressBar.style.width = pct + '%';
    }
  };

  Wizard.prototype.validateCurrent = function () {
    var card = this.cards[this.index];
    if (!card) return true;

    var stepId = card.dataset.step;
    if (stepId === 'location') {
      var city = document.getElementById('onboardingCity');
      if (city && !String(city.value || '').trim()) {
        city.focus();
        city.reportValidity();
        return false;
      }
      return true;
    }

    if (card.dataset.required !== 'true' && stepId !== 'contact') {
      return true;
    }

    if (stepId === 'contact') {
      var fields = card.querySelectorAll('input[required], select[required], textarea[required]');
      for (var i = 0; i < fields.length; i += 1) {
        if (!fields[i].checkValidity()) {
          fields[i].reportValidity();
          return false;
        }
      }
      return true;
    }

    var requiredFields = card.querySelectorAll('input[required], select[required], textarea[required]');
    for (var j = 0; j < requiredFields.length; j += 1) {
      if (!requiredFields[j].checkValidity()) {
        requiredFields[j].reportValidity();
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

    var stepId = STEP_IDS[this.index];
    var isFirst = this.index === 0;
    var isReview = stepId === 'review';

    this.backBtn.hidden = isFirst;
    this.nextBtn.hidden = isReview;
    this.submitBtn.hidden = !isReview;

    if (isReview) {
      this.renderReview();
    }

    if (stepId === 'location') {
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
      this.showStep(next);
    }
  };

  Wizard.prototype.fieldValue = function (name) {
    var field = this.form.querySelector('[name="' + name + '"]');
    if (!field) return '';
    if (field.type === 'radio') {
      var checked = this.form.querySelector('[name="' + name + '"]:checked');
      return checked ? String(checked.value) : '';
    }
    if (field.type === 'file') {
      if (!field.files || !field.files.length) return '—';
      return field.files[0].name;
    }
    return String(field.value || '').trim() || '—';
  };

  Wizard.prototype.renderReview = function () {
    if (!this.reviewEl) return;
    var labels = (this.config && this.config.reviewLabels) || {};
    var rows = [
      ['name', 'name'],
      ['slug', 'slug'],
      ['titleHe', 'titleHe'],
      ['city', 'city'],
      ['contactName', 'contactName'],
      ['adminEmail', 'adminEmail'],
      ['logo', 'logo'],
      ['logoBackground', 'logoBackground'],
    ];
    this.reviewEl.innerHTML = '';
    rows.forEach(function (row) {
      var dt = document.createElement('dt');
      dt.textContent = labels[row[0]] || row[0];
      var dd = document.createElement('dd');
      dd.textContent = this.fieldValue(row[1]);
      this.reviewEl.appendChild(dt);
      this.reviewEl.appendChild(dd);
    }, this);
  };

  Wizard.prototype.previewLogo = function (input) {
    var preview = document.getElementById('onboardingLogoPreview');
    var img = document.getElementById('onboardingLogoPreviewImg');
    if (!preview || !img || !input.files || !input.files[0]) {
      if (preview) preview.hidden = true;
      return;
    }
    img.src = URL.createObjectURL(input.files[0]);
    preview.hidden = false;
    this.applyLogoBackgroundPreview();
  };

  Wizard.prototype.applyLogoBackgroundPreview = function () {
    var preview = document.getElementById('onboardingLogoPreview');
    if (!preview) return;
    var bg = this.fieldValue('logoBackground');
    preview.classList.remove('logo-bg-white', 'logo-bg-black');
    if (bg === 'white') preview.classList.add('logo-bg-white');
    if (bg === 'black') preview.classList.add('logo-bg-black');
  };

  function init() {
    var form = document.getElementById('onboardingForm');
    if (!form) return;
    var config = getConfig();
    var wizard = new Wizard(form, config);
    wizard.init();

    var bgRadios = form.querySelectorAll('input[name="logoBackground"]');
    Array.prototype.forEach.call(bgRadios, function (radio) {
      radio.addEventListener('change', function () {
        wizard.applyLogoBackgroundPreview();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
