(function () {
  var DEBOUNCE_MS = 320;
  var DEFAULT_LAT = 55.0226;
  var DEFAULT_LNG = 82.9318;
  var DEFAULT_ZOOM = 11;

  function normalizeSlugValue(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function slugFromName(name) {
    return normalizeSlugValue(
      String(name || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-'),
    );
  }

  function debounce(fn, ms) {
    var timer;
    return function () {
      var args = arguments;
      var self = this;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(self, args);
      }, ms);
    };
  }

  function LocationPicker(form) {
    this.form = form;
    this.searchInput = form.querySelector('.master-city-search');
    this.resultsEl = form.querySelector('.master-city-results');
    this.cityHidden = form.querySelector('.master-city-hidden');
    this.latHidden = form.querySelector('.master-lat-hidden');
    this.lngHidden = form.querySelector('.master-lng-hidden');
    this.latDisplay = form.querySelector('.master-lat-display');
    this.lngDisplay = form.querySelector('.master-lng-display');
    this.timezoneInput = form.querySelector('.master-timezone-input');
    this.mapEl = form.querySelector('.master-map');
    this.map = null;
    this.marker = null;
    this.initialized = false;
  }

  LocationPicker.prototype.init = function () {
    if (this.initialized || !this.mapEl || typeof L === 'undefined') {
      return;
    }

    var lat = parseFloat(this.latHidden && this.latHidden.value);
    var lng = parseFloat(this.lngHidden && this.lngHidden.value);
    if (!Number.isFinite(lat)) lat = parseFloat(this.mapEl.dataset.defaultLat) || DEFAULT_LAT;
    if (!Number.isFinite(lng)) lng = parseFloat(this.mapEl.dataset.defaultLng) || DEFAULT_LNG;

    this.setCoordinates(lat, lng, this.cityHidden ? this.cityHidden.value : '', this.timezoneInput ? this.timezoneInput.value : '', false);

    this.map = L.map(this.mapEl, { scrollWheelZoom: true }).setView([lat, lng], DEFAULT_ZOOM);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.map);

    this.marker = L.marker([lat, lng], { draggable: true }).addTo(this.map);
    var self = this;

    this.marker.on('dragend', function () {
      var pos = self.marker.getLatLng();
      self.setCoordinates(pos.lat, pos.lng, self.cityHidden ? self.cityHidden.value : '', null, true);
    });

    this.map.on('click', function (event) {
      self.marker.setLatLng(event.latlng);
      self.setCoordinates(event.latlng.lat, event.latlng.lng, self.cityHidden ? self.cityHidden.value : '', null, true);
    });

    if (this.searchInput) {
      this.searchInput.addEventListener('input', debounce(function () {
        self.searchPlaces(self.searchInput.value);
      }, DEBOUNCE_MS));

      this.searchInput.addEventListener('focus', function () {
        if (self.resultsEl && self.resultsEl.children.length) {
          self.resultsEl.hidden = false;
        }
      });
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

  LocationPicker.prototype.setCoordinates = function (lat, lng, city, timezone, reverseGeocode) {
    if (this.latHidden) this.latHidden.value = Number(lat).toFixed(6);
    if (this.lngHidden) this.lngHidden.value = Number(lng).toFixed(6);
    if (this.latDisplay) this.latDisplay.value = Number(lat).toFixed(6);
    if (this.lngDisplay) this.lngDisplay.value = Number(lng).toFixed(6);
    if (city && this.cityHidden) this.cityHidden.value = city;
    if (timezone && this.timezoneInput) this.timezoneInput.value = timezone;

    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    }
    if (this.map) {
      this.map.setView([lat, lng], this.map.getZoom() || DEFAULT_ZOOM);
    }

    if (reverseGeocode) {
      this.reverseGeocode(lat, lng);
    }
  };

  LocationPicker.prototype.applyPlace = function (place) {
    if (!place) return;
    if (this.searchInput) this.searchInput.value = place.label || place.city || '';
    if (this.cityHidden) this.cityHidden.value = place.city || place.label || '';
    if (this.timezoneInput && place.timezone) this.timezoneInput.value = place.timezone;
    this.setCoordinates(place.lat, place.lng, place.city, place.timezone, false);
    if (this.resultsEl) this.resultsEl.hidden = true;
  };

  LocationPicker.prototype.searchPlaces = function (query) {
    var self = this;
    var q = String(query || '').trim();
    if (!this.resultsEl) return;

    if (q.length < 2) {
      this.resultsEl.innerHTML = '';
      this.resultsEl.hidden = true;
      return;
    }

    fetch('/master/api/places?q=' + encodeURIComponent(q))
      .then(function (res) { return res.json(); })
      .then(function (items) {
        self.resultsEl.innerHTML = '';
        if (!items || !items.length) {
          self.resultsEl.innerHTML = '<div class="master-city-empty">No places found</div>';
          self.resultsEl.hidden = false;
          return;
        }

        items.forEach(function (item) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'master-city-option';
          btn.textContent = item.label;
          btn.addEventListener('click', function () {
            self.applyPlace(item);
          });
          self.resultsEl.appendChild(btn);
        });
        self.resultsEl.hidden = false;
      })
      .catch(function () {
        self.resultsEl.innerHTML = '<div class="master-city-empty">Search failed</div>';
        self.resultsEl.hidden = false;
      });
  };

  LocationPicker.prototype.reverseGeocode = function (lat, lng) {
    var self = this;
    fetch('/master/api/reverse?lat=' + encodeURIComponent(lat) + '&lng=' + encodeURIComponent(lng))
      .then(function (res) { return res.json(); })
      .then(function (place) {
        if (place.city && self.cityHidden) self.cityHidden.value = place.city;
        if (place.label && self.searchInput) self.searchInput.value = place.label;
        if (place.timezone && self.timezoneInput) self.timezoneInput.value = place.timezone;
      })
      .catch(function () { /* ignore */ });
  };

  function bindSlugInputs(root) {
    root.querySelectorAll('.master-slug-input').forEach(function (input) {
      input.addEventListener('blur', function () {
        input.value = normalizeSlugValue(input.value);
      });
    });

    var addName = root.querySelector('#addName');
    var addSlug = root.querySelector('#addSlug');
    if (addName && addSlug) {
      addName.addEventListener('blur', function () {
        if (!addSlug.value.trim()) {
          addSlug.value = slugFromName(addName.value);
        }
      });
    }
  }

  function bindEditToggles(root) {
    root.querySelectorAll('.master-toggle-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = btn.closest('.master-community-card');
        var panel = card && card.querySelector('.master-community-edit');
        if (!panel) return;

        var open = panel.hidden;
        panel.hidden = !open;
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        var closeLabel = btn.dataset.labelClose || 'Close';
        var editLabel = btn.dataset.labelEdit || 'Edit';
        btn.textContent = open ? closeLabel : editLabel;

        if (open) {
          var form = panel.querySelector('.master-community-form');
          var picker = form && form._locationPicker;
          if (picker) {
            picker.init();
            setTimeout(function () {
              if (picker.map) picker.map.invalidateSize();
            }, 250);
          }
        }
      });
    });
  }

  function initForms() {
    document.querySelectorAll('.master-community-form[data-location-picker]').forEach(function (form) {
      var picker = new LocationPicker(form);
      form._locationPicker = picker;
      if (form.dataset.locationPicker === 'add') {
        picker.init();
      }
    });

    bindSlugInputs(document);
    bindEditToggles(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initForms);
  } else {
    initForms();
  }
})();
