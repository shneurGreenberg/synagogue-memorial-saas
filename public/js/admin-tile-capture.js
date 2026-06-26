(function () {
  function loadHtml2Canvas() {
    if (window.html2canvas) {
      return Promise.resolve(window.html2canvas);
    }

    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      script.async = true;
      script.onload = function () {
        resolve(window.html2canvas);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function waitForExportReady(doc, readyClass, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var timeout = window.setTimeout(function () {
        reject(new Error('card_export_timeout'));
      }, timeoutMs || 30000);

      function check() {
        if (!doc || !doc.body) {
          window.requestAnimationFrame(check);
          return;
        }

        if (doc.body.classList.contains(readyClass)) {
          window.clearTimeout(timeout);
          resolve();
          return;
        }

        window.requestAnimationFrame(check);
      }

      check();
    });
  }

  function sanitizeFilename(name) {
    return String(name || 'memorial').replace(/[^\w\u0590-\u05FF.-]+/g, '_') + '-card.png';
  }

  function downloadDataUrl(dataUrl, personName) {
    if (!dataUrl) {
      return;
    }

    var link = document.createElement('a');
    link.href = dataUrl;
    link.download = sanitizeFilename(personName);
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function captureBoardCardPng(exportUrl) {
    return new Promise(function (resolve, reject) {
      var iframe = document.createElement('iframe');
      iframe.setAttribute('aria-hidden', 'true');
      iframe.tabIndex = -1;
      iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:1920px;height:1080px;opacity:0;pointer-events:none;border:0';
      iframe.src = exportUrl;

      function cleanup() {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }

      iframe.addEventListener('error', function () {
        cleanup();
        reject(new Error('card_export_frame_error'));
      });

      iframe.addEventListener('load', function () {
        var doc = iframe.contentDocument;
        waitForExportReady(doc, 'card-export-ready', 30000).then(function () {
          return new Promise(function (resolveDelay) {
            window.setTimeout(resolveDelay, 250);
          });
        }).then(function () {
          var card = doc && doc.querySelector('#cardExportRoot .card-detail');
          if (!card) {
            throw new Error('card_export_detail_missing');
          }

          return loadHtml2Canvas().then(function (html2canvas) {
            return html2canvas(card, {
              backgroundColor: null,
              scale: 2,
              useCORS: true,
              allowTaint: true,
              logging: false,
              imageTimeout: 15000,
            });
          });
        }).then(function (canvas) {
          cleanup();
          resolve(canvas.toDataURL('image/png'));
        }).catch(function (err) {
          cleanup();
          reject(err);
        });
      });

      document.body.appendChild(iframe);
    });
  }

  function buildCardExportUrl(slug, personId) {
    return '/s/' + encodeURIComponent(slug) + '/card/' + encodeURIComponent(personId) + '?export=1';
  }

  function downloadBoardCardImage(slug, personId, personName) {
    var exportUrl = buildCardExportUrl(slug, personId);
    return captureBoardCardPng(exportUrl).then(function (dataUrl) {
      downloadDataUrl(dataUrl, personName);
      return dataUrl;
    });
  }

  window.AdminTileCapture = {
    buildCardExportUrl: buildCardExportUrl,
    captureBoardCardPng: captureBoardCardPng,
    downloadBoardCardImage: downloadBoardCardImage,
    downloadDataUrl: downloadDataUrl,
  };
})();
