(function () {
  var params = new URLSearchParams(window.location.search);
  if (params.get('preview') !== '1') {
    return;
  }

  var appData = window.data || {};
  var slug = appData.slug;
  var features = appData.boardFeatures || {};
  var learningKeys = ['dailyChumash', 'dailyTehillim', 'dailyTanya', 'dailyRambam', 'hayomYom'];
  var hasLearning = learningKeys.some(function (key) {
    return features[key] === true;
  });

  if (!slug || !hasLearning) {
    return;
  }

  var labels = {
    ru: {
      daily_gates_title: 'Ежедневное изучение',
      daily_chumash: 'Хумаш',
      daily_tehillim: 'Тегилим',
      daily_tanya: 'Тания',
      daily_rambam: 'Рамбам',
      daily_rambam_one: '1 глава',
      daily_rambam_three: '3 главы',
      hayom_yom_title: 'ХаЙом Йом',
      hayom_yom_loading: 'Загрузка ХаЙом Йом...',
    },
    he: {
      daily_gates_title: 'לימוד יומי',
      daily_chumash: 'חומש',
      daily_tehillim: 'תהילים',
      daily_tanya: 'תניא',
      daily_rambam: 'רמב״ם',
      daily_rambam_one: 'פרק אחד',
      daily_rambam_three: '3 פרקים',
      hayom_yom_title: 'היום יום',
      hayom_yom_loading: 'טוען היום יום...',
    },
    en: {
      daily_gates_title: 'Daily study',
      daily_chumash: 'Chumash',
      daily_tehillim: 'Tehillim',
      daily_tanya: 'Tanya',
      daily_rambam: 'Rambam',
      daily_rambam_one: '1 chapter',
      daily_rambam_three: '3 chapters',
      hayom_yom_title: 'Hayom Yom',
      hayom_yom_loading: 'Loading Hayom Yom...',
    },
  };

  function resolveLang() {
    var previewLang = params.get('previewLang');
    if (previewLang && labels[previewLang]) {
      return previewLang;
    }
    var lang = appData.language || 'ru';
    return labels[lang] ? lang : 'ru';
  }

  function t(key) {
    var lang = resolveLang();
    return (labels[lang] && labels[lang][key]) || labels.ru[key] || key;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function learningTile(label, item, sublabel) {
    if (!item || !item.label) {
      return '';
    }
    var sub = sublabel ? '<span class="daily-gate-sublabel">' + escapeHtml(sublabel) + '</span>' : '';
    return '<div class="daily-gate-tile"><span class="daily-gate-label">' + escapeHtml(label) + '</span>'
      + sub + '<span class="daily-gate-value">' + escapeHtml(item.label) + '</span></div>';
  }

  function buildPanelsHtml(feed) {
    var learning = (feed && feed.dailyLearning) || {};
    var hayomYom = learning.hayomYom || {};
    var lessons5703 = hayomYom.lessons5703 || {};
    var html = '<div class="jewish-sidebar-panels board-preview-daily-learning">';

    var showGates = features.dailyChumash || features.dailyTehillim || features.dailyTanya || features.dailyRambam;
    if (showGates) {
      html += '<section class="daily-gates-panel" aria-label="' + escapeHtml(t('daily_gates_title')) + '">';
      html += '<h2>' + escapeHtml(t('daily_gates_title')) + '</h2><ul class="daily-gates-grid">';
      var chumash = features.dailyChumash ? learningTile(t('daily_chumash'), learning.chumash) : '';
      var tanyaItem = lessons5703.tanya && lessons5703.tanya.label ? lessons5703.tanya : learning.tanya;
      var tanya = features.dailyTanya ? learningTile(t('daily_tanya'), tanyaItem) : '';
      if (chumash || tanya) {
        html += '<li class="daily-gates-row' + (chumash && tanya ? '' : ' daily-gates-row--single') + '">' + chumash + tanya + '</li>';
      }
      if (features.dailyTehillim) {
        html += '<li class="daily-gates-row daily-gates-row--single">' + learningTile(t('daily_tehillim'), learning.tehillim) + '</li>';
      }
      if (features.dailyRambam && (learning.rambam || learning.rambam3)) {
        html += '<li class="daily-gates-row">';
        if (learning.rambam) {
          html += learningTile(t('daily_rambam'), learning.rambam, t('daily_rambam_one'));
        }
        if (learning.rambam3) {
          html += learningTile(t('daily_rambam'), learning.rambam3, t('daily_rambam_three'));
        }
        html += '</li>';
      }
      html += '</ul></section>';
    }

    if (features.hayomYom) {
      var hayomText = hayomYom.text
        || (lessons5703.chumash && lessons5703.chumash.label)
        || (lessons5703.tehillim && lessons5703.tehillim.label)
        || (lessons5703.tanya && lessons5703.tanya.label);
      html += '<section class="hayom-yom-panel" aria-label="' + escapeHtml(t('hayom_yom_title')) + '">';
      html += '<h2>' + escapeHtml(t('hayom_yom_title')) + '</h2>';
      if (hayomText) {
        html += '<div class="hayom-yom-scroll"><div class="hayom-yom-track"><div class="hayom-yom-inner"><p class="hayom-yom-text">'
          + escapeHtml(hayomText) + '</p></div></div></div>';
      } else {
        html += '<p class="hayom-yom-note">' + escapeHtml(t('hayom_yom_loading')) + '</p>';
      }
      html += '</section>';
    }

    html += '</div>';
    return html;
  }

  function mountPanels(feed) {
    if (document.querySelector('.jewish-sidebar-panels')) {
      return true;
    }
    var host = document.querySelector('.left-panel-inner');
    if (!host) {
      return false;
    }
    var wrapper = document.createElement('div');
    wrapper.innerHTML = buildPanelsHtml(feed);
    var panel = wrapper.firstElementChild;
    if (!panel) {
      return false;
    }
    var donation = host.querySelector('.donation-qr-panel, .memorial-submission-panel');
    if (donation) {
      host.insertBefore(panel, donation);
    } else {
      host.appendChild(panel);
    }
    return true;
  }

  function loadFeed() {
    var lang = resolveLang();
    var query = new URLSearchParams({ lang: lang });
    return fetch('/s/' + encodeURIComponent(slug) + '/api/jewish-content?' + query.toString(), {
      headers: { Accept: 'application/json' },
    }).then(function (response) {
      if (!response.ok) {
        throw new Error('jewish-content');
      }
      return response.json();
    });
  }

  var attempts = 0;
  function tryMount() {
    if (document.querySelector('.jewish-sidebar-panels')) {
      return;
    }
    attempts += 1;
    if (attempts > 80) {
      return;
    }
    loadFeed().then(function (feed) {
      if (!mountPanels(feed)) {
        window.setTimeout(tryMount, 150);
      }
    }).catch(function () {
      window.setTimeout(tryMount, 500);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      window.setTimeout(tryMount, 300);
    });
  } else {
    window.setTimeout(tryMount, 300);
  }
})();
