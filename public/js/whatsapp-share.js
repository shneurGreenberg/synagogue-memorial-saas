/* 1.40.0 I86: "Share on WhatsApp" for a yahrzeit memorial tile.
 *
 * Mobile (Web Share Level 2): the PNG tile + the yahrzeit message text are handed to the
 * native share sheet, so the user picks WhatsApp itself.
 * Desktop: WhatsApp Web cannot receive a pasted file programmatically, so the image is copied
 * to the clipboard (or downloaded as a fallback), WhatsApp Web is opened with the message text,
 * and a short text-only hint tells the user to paste/attach it. No colour-only signalling.
 *
 * Any element with [data-whatsapp-share] is wired through one delegated click listener:
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
      copied: 'התמונה הועתקה — הדביקו אותה בוואטסאפ (Ctrl+V)',
      downloaded: 'התמונה הורדה — צרפו אותה בוואטסאפ',
      failed: 'לא הצלחנו להכין את התמונה — צרפו אותה ידנית',
    },
    ru: {
      copied: 'Изображение скопировано — вставьте его в WhatsApp (Ctrl+V)',
      downloaded: 'Изображение скачано — прикрепите его в WhatsApp',
      failed: 'Не удалось подготовить изображение — прикрепите его вручную',
    },
    en: {
      copied: 'Image copied — paste it in WhatsApp (Ctrl+V)',
      downloaded: 'Image downloaded — attach it in WhatsApp',
      failed: "Couldn't prepare the image — attach it manually",
    },
  };

  var WHATSAPP_WEB_URL = 'https://web.whatsapp.com/send?text=';

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

  function buildWhatsAppWebUrl(text, link) {
    return WHATSAPP_WEB_URL + encodeURIComponent(joinShareText(text, link));
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
    // `hint` may be a single string (used for both outcomes) or per-outcome overrides.
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
    var existing = document.getElementById('whatsappShareHint');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'whatsappShareHint';
    toast.className = 'whatsapp-share-hint';
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

  /**
   * Share a memorial tile on WhatsApp.
   * `hint` may be a language code ('he'|'ru'|'en'), a single string used for both desktop
   * outcomes, or `{ copied, downloaded, failed }`.
   * Returns 'shared' | 'copied' | 'downloaded' | 'text-only' | 'cancelled'.
   * An AbortError from the user cancelling the native share sheet is silent.
   */
  async function shareToWhatsApp(options) {
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
    if (file && nav && typeof nav.share === 'function' && typeof nav.canShare === 'function'
      && nav.canShare({ files: [file] })) {
      try {
        await nav.share({ files: [file], text: joinShareText(text, link) });
        return 'shared';
      } catch (err) {
        if (err && err.name === 'AbortError') return 'cancelled';
        // Fall through to the desktop path when the native share refuses the file.
      }
    }

    var status = 'text-only';
    if (blob) {
      var copied = await copyImageToClipboard(blob);
      if (copied) {
        status = 'copied';
      } else if (downloadBlob(blob, fileName)) {
        status = 'downloaded';
      } else {
        status = 'text-only';
      }
    }

    try {
      if (typeof window !== 'undefined' && window.open) {
        window.open(buildWhatsAppWebUrl(text, link), '_blank');
      }
    } catch (err) {
      /* a blocked popup must not break the flow */
    }

    showHint(hints[status] || hints.failed);
    return status;
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
    var button = target && target.closest ? target.closest('[data-whatsapp-share]') : null;
    if (!button) return;
    event.preventDefault();
    if (button.getAttribute('data-share-busy') === '1') return;
    button.setAttribute('data-share-busy', '1');
    try {
      var text = shareTextFor(button);
      if (!text) {
        text = await messageTextFromEndpoint(button.getAttribute('data-share-message-url') || '');
      }
      await shareToWhatsApp({
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
    shareToWhatsApp: shareToWhatsApp,
    buildWhatsAppWebUrl: buildWhatsAppWebUrl,
    joinShareText: joinShareText,
    sanitizeFileName: sanitizeFileName,
    hintMessages: hintMessages,
    normalizeLang: normalizeLang,
    handleShareClick: handleShareClick,
  };

  if (root) root.WhatsAppShare = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('click', function (event) {
      handleShareClick(event).catch(function () { /* never break the page */ });
    });
  }
}(typeof window !== 'undefined' ? window : {}));
