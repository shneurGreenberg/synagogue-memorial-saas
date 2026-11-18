/* 1.42.0 I90: "Send message" for a yahrzeit memorial tile.
 *
 * When the platform can share files, the PNG tile plus the message text and link go to the
 * native share sheet so the user picks any channel.
 * When only text sharing exists, the sheet gets the text and link, and the image is copied
 * (or downloaded).
 * Desktop: the image is copied (ClipboardItem) or downloaded, the text and link are copied,
 * and a short text hint says both can be pasted into any app. WhatsApp Web is never opened.
 *
 * Any element with [data-message-share] (or the legacy [data-whatsapp-share]) is wired
 * through one delegated click listener:
 *   data-share-image        PNG tile URL (same origin)
 *   data-share-message-url  optional JSON endpoint returning { preparedMessage }
 *   data-share-text         optional message text (a .yahrzeit-message textarea wins)
 *   data-share-link         link to append (defaults to the page's data-board-url)
 *   data-share-file         file name base
 */
(function (root) {
  'use strict';

  var HINT_TEXT = {
    he: {
      copied: 'התמונה וההודעה הועתקו — ניתן להדביק בכל יישום (Ctrl+V)',
      downloaded: 'התמונה הורדה וההודעה הועתקה — ניתן להדביק בכל יישום',
      failed: 'לא הצלחנו להכין את התמונה — העתיקו את ההודעה ידנית',
    },
    ru: {
      copied: 'Изображение и сообщение скопированы — вставьте их в любое приложение (Ctrl+V)',
      downloaded: 'Изображение скачано, сообщение скопировано — вставьте в любое приложение',
      failed: 'Не удалось подготовить изображение — скопируйте сообщение вручную',
    },
    en: {
      copied: 'Image and message copied — paste them into any app (Ctrl+V)',
      downloaded: 'Image downloaded and the message copied — paste them into any app',
      failed: "Couldn't prepare the image — copy the message manually",
    },
  };

  function normalizeLang(value) {
    var lang = String(value || '').slice(0, 2).toLowerCase();
    return HINT_TEXT[lang] ? lang : 'ru';
  }

  function documentLang() {
    try {
      if (typeof document !== 'undefined' && document.documentElement) {
        return document.documentElement.getAttribute('lang') || '';
      }
    } catch (err) {
      return '';
    }
    return '';
  }

  function hintMessages(lang) {
    return HINT_TEXT[normalizeLang(lang || documentLang())];
  }

  /** Message text + link, never a stray blank line when one of them is empty. */
  function joinShareText(text, link) {
    var body = String(text == null ? '' : text).trim();
    var url = String(link == null ? '' : link).trim();
    if (!url) return body;
    return body ? body + '\n' + url : url;
  }

  function sanitizeFileName(name) {
    var base = String(name || 'memorial')
      .trim()
      .replace(/[^\w\u0590-\u05FF.-]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return (base || 'memorial') + '-tile.png';
  }

  function pageElement() {
    try {
      return typeof document !== 'undefined' ? document.querySelector('.admin-page') : null;
    } catch (err) {
      return null;
    }
  }

  function pageAttribute(name) {
    var page = pageElement();
    return page ? (page.getAttribute(name) || '') : '';
  }

  function resolveHints(custom) {
    var base = hintMessages();
    if (typeof custom === 'string') {
      return { copied: custom, downloaded: custom, failed: custom };
    }
    var overrides = custom || {};
    return {
      copied: overrides.copied || base.copied,
      downloaded: overrides.downloaded || base.downloaded,
      failed: overrides.failed || base.failed,
    };
  }

  function showHint(message) {
    if (!message || typeof document === 'undefined' || !document.body) return;
    var existing = document.getElementById('messageShareHint');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'messageShareHint';
    toast.className = 'message-share-hint';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = message;
    toast.style.cssText = [
      'position:fixed',
      'inset-inline:16px',
      'bottom:16px',
      'z-index:3000',
      'padding:12px 16px',
      'border-radius:12px',
      'background:#1f2430',
      'color:#ffffff',
      'font-weight:600',
      'line-height:1.4',
      'box-shadow:0 16px 40px rgba(0,0,0,0.35)',
      'border:1px solid rgba(255,255,255,0.24)',
    ].join(';');
    toast.addEventListener('click', function () { toast.remove(); });
    document.body.appendChild(toast);
    if (typeof window !== 'undefined' && window.setTimeout) {
      window.setTimeout(function () { toast.remove(); }, 7000);
    }
  }

  function downloadBlob(blob, fileName) {
    if (!blob || typeof document === 'undefined' || !window.URL || !window.URL.createObjectURL) {
      return false;
    }
    var url = window.URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { window.URL.revokeObjectURL(url); }, 2000);
    return true;
  }

  async function fetchImageBlob(imageUrl) {
    if (!imageUrl || typeof fetch !== 'function') return null;
    try {
      var response = await fetch(imageUrl, { credentials: 'same-origin' });
      if (!response || !response.ok) return null;
      return await response.blob();
    } catch (err) {
      return null;
    }
  }

  async function copyImageToClipboard(blob) {
    if (!blob) return false;
    try {
      var nav = typeof navigator !== 'undefined' ? navigator : null;
      if (!nav || !nav.clipboard || typeof nav.clipboard.write !== 'function') return false;
      if (typeof ClipboardItem === 'undefined') return false;
      var item = new ClipboardItem({ 'image/png': blob });
      await nav.clipboard.write([item]);
      return true;
    } catch (err) {
      return false;
    }
  }

  async function copyTextToClipboard(text) {
    var value = String(text || '');
    if (!value) return false;
    try {
      var nav = typeof navigator !== 'undefined' ? navigator : null;
      if (!nav || !nav.clipboard || typeof nav.clipboard.writeText !== 'function') return false;
      await nav.clipboard.writeText(value);
      return true;
    } catch (err) {
      return false;
    }
  }

  async function placeImage(blob, fileName) {
    if (!blob) return 'text-only';
    if (await copyImageToClipboard(blob)) return 'copied';
    if (downloadBlob(blob, fileName)) return 'downloaded';
    return 'text-only';
  }

  function sharePayload(text, link, extra) {
    var payload = extra || {};
    var body = String(text || '').trim();
    var url = String(link || '').trim();
    if (body) payload.text = body;
    if (url) payload.url = url;
    return payload;
  }

  /**
   * Share a memorial tile through the system share sheet, or copy it for any app.
   * `hint` may be a language code ('he'|'ru'|'en'), a single string used for every outcome,
   * or `{ copied, downloaded, failed }`.
   * Returns 'shared' | 'copied' | 'downloaded' | 'text-only' | 'cancelled'.
   * An AbortError from the user cancelling the native share sheet is silent.
   */
  async function shareMessage(options) {
    var opts = options || {};
    var text = String(opts.text || '');
    var link = String(opts.link || '');
    var fileName = sanitizeFileName(opts.fileName);
    var hints = resolveHints(opts.hint);
    var blob = await fetchImageBlob(String(opts.imageUrl || ''));
    var file = null;

    if (blob && typeof File === 'function') {
      try {
        file = new File([blob], fileName, { type: blob.type || 'image/png' });
      } catch (err) {
        file = null;
      }
    }

    var nav = typeof navigator !== 'undefined' ? navigator : null;
    var canShareFiles = false;
    try {
      canShareFiles = !!(file && nav && typeof nav.share === 'function'
        && typeof nav.canShare === 'function'
        && nav.canShare({ files: [file] }));
    } catch (err) {
      canShareFiles = false;
    }

    if (canShareFiles) {
      try {
        await nav.share(sharePayload(text, link, { files: [file] }));
        return 'shared';
      } catch (err) {
        if (err && err.name === 'AbortError') return 'cancelled';
      }
    }

    var imageStatus = await placeImage(blob, fileName);

    if (nav && typeof nav.share === 'function') {
      try {
        await nav.share(sharePayload(text, link));
        if (imageStatus === 'copied' || imageStatus === 'downloaded') {
          showHint(hints[imageStatus]);
        }
        return imageStatus === 'text-only' ? 'shared' : imageStatus;
      } catch (err) {
        if (err && err.name === 'AbortError') return 'cancelled';
      }
    }

    await copyTextToClipboard(joinShareText(text, link));
    showHint(hints[imageStatus] || hints.failed);
    return imageStatus;
  }

  function shareTextFor(button) {
    if (!button || !button.closest) return '';
    var block = button.closest('.yahrzeit-message-block');
    var scope = block || button.closest('.yahrzeit-card');
    var textarea = scope && scope.querySelector ? scope.querySelector('.yahrzeit-message') : null;
    if (textarea && textarea.value) return textarea.value;
    return button.getAttribute('data-share-text') || '';
  }

  async function messageTextFromEndpoint(url) {
    if (!url || typeof fetch !== 'function') return '';
    try {
      var response = await fetch(url, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      if (!response || !response.ok) return '';
      var payload = await response.json();
      return (payload && payload.preparedMessage) || '';
    } catch (err) {
      return '';
    }
  }

  async function handleShareClick(event) {
    var target = event.target;
    var button = target && target.closest
      ? target.closest('[data-message-share], [data-whatsapp-share]')
      : null;
    if (!button) return;
    event.preventDefault();
    if (button.getAttribute('data-share-busy') === '1') return;
    button.setAttribute('data-share-busy', '1');
    try {
      var text = shareTextFor(button);
      if (!text) {
        text = await messageTextFromEndpoint(button.getAttribute('data-share-message-url') || '');
      }
      await shareMessage({
        imageUrl: button.getAttribute('data-share-image') || '',
        text: text,
        link: button.getAttribute('data-share-link') || pageAttribute('data-board-url'),
        fileName: button.getAttribute('data-share-file') || '',
        hint: {
          copied: button.getAttribute('data-share-hint-copied') || pageAttribute('data-share-hint-copied'),
          downloaded: button.getAttribute('data-share-hint-downloaded') || pageAttribute('data-share-hint-downloaded'),
          failed: button.getAttribute('data-share-hint-failed') || pageAttribute('data-share-hint-failed'),
        },
      });
    } finally {
      button.removeAttribute('data-share-busy');
    }
  }

  var api = {
    shareMessage: shareMessage,
    shareToWhatsApp: shareMessage,
    joinShareText: joinShareText,
    sanitizeFileName: sanitizeFileName,
    hintMessages: hintMessages,
    normalizeLang: normalizeLang,
    handleShareClick: handleShareClick,
  };

  if (root) {
    root.MessageShare = api;
    root.WhatsAppShare = api;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('click', function (event) {
      handleShareClick(event).catch(function () { /* never break the page */ });
    });
  }
}(typeof window !== 'undefined' ? window : {}));
