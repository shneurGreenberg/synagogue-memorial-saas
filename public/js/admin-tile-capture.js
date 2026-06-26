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

  function waitForExportReady(doc, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var timeout = window.setTimeout(function () {
        reject(new Error('tile_export_timeout'));
      }, timeoutMs || 30000);

      function check() {
        if (!doc || !doc.body) {
          window.requestAnimationFrame(check);
          return;
        }

        if (doc.body.classList.contains('tile-export-ready')) {
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
    return String(name || 'memorial').replace(/[^\w\u0590-\u05FF.-]+/g, '_') + '-tile.png';
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

  function captureBoardTilePng(exportUrl) {
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
        reject(new Error('tile_export_frame_error'));
      });

      iframe.addEventListener('load', function () {
        var doc = iframe.contentDocument;
        waitForExportReady(doc, 30000).then(function () {
          return new Promise(function (resolve) {
            window.setTimeout(resolve, 250);
          });
        }).then(function () {
          var card = doc && doc.querySelector('#tileExportCard .card');
          if (!card) {
            throw new Error('tile_export_card_missing');
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

  function buildTileExportUrl(slug, personId, options) {
    options = options || {};
    var url = '/s/' + encodeURIComponent(slug) + '/export/tile/' + encodeURIComponent(personId);
    if (options.yahrzeit) {
      url += '?yahrzeit=1';
    }
    return url;
  }

  function downloadBoardTileImage(slug, personId, personName, options) {
    var exportUrl = buildTileExportUrl(slug, personId, options);
    return captureBoardTilePng(exportUrl).then(function (dataUrl) {
      downloadDataUrl(dataUrl, personName);
      return dataUrl;
    });
  }

  window.AdminTileCapture = {
    buildTileExportUrl: buildTileExportUrl,
    captureBoardTilePng: captureBoardTilePng,
    downloadBoardTileImage: downloadBoardTileImage,
    downloadDataUrl: downloadDataUrl,
  };
})();
