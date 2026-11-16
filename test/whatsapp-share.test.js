const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function loadWhatsAppShare() {
  const sandbox = { module: { exports: {} }, window: {} };
  sandbox.window.window = sandbox.window;
  vm.runInNewContext(read('public/js/whatsapp-share.js'), sandbox, { filename: 'whatsapp-share.js' });
  return { api: sandbox.module.exports, windowApi: sandbox.window.WhatsAppShare };
}

describe('1.40.0 I86 whatsapp-share: pure helpers', () => {
  it('joins the message text and the board link with a single newline', () => {
    const { api } = loadWhatsAppShare();
    assert.equal(api.joinShareText('Hello', 'https://example.org/s/a'), 'Hello\nhttps://example.org/s/a');
    assert.equal(api.joinShareText('Hello\n', '  https://example.org/s/a  '), 'Hello\nhttps://example.org/s/a');
    assert.equal(api.joinShareText('', 'https://example.org/s/a'), 'https://example.org/s/a');
    assert.equal(api.joinShareText('Hello', ''), 'Hello');
    assert.equal(api.joinShareText(null, null), '');
  });

  it('builds the desktop web.whatsapp.com URL with an encoded text', () => {
    const { api } = loadWhatsAppShare();
    const url = api.buildWhatsAppWebUrl('שלום עולם', 'https://example.org/s/a');
    assert.equal(url, 'https://web.whatsapp.com/send?text=' + encodeURIComponent('שלום עולם\nhttps://example.org/s/a'));
    assert.match(url, /^https:\/\/web\.whatsapp\.com\/send\?text=/);
    // the newline and the link separators must be encoded, never bare
    assert.doesNotMatch(url.slice('https://web.whatsapp.com/send?text='.length), /[\n &]/);
    assert.equal(
      api.buildWhatsAppWebUrl('a & b', ''),
      'https://web.whatsapp.com/send?text=a%20%26%20b',
    );
  });

  it('sanitizes the file name and always ends with -tile.png', () => {
    const { api } = loadWhatsAppShare();
    assert.equal(api.sanitizeFileName('אברהם כהן'), 'אברהם_כהן-tile.png');
    assert.equal(api.sanitizeFileName('John / Doe'), 'John_Doe-tile.png');
    assert.equal(api.sanitizeFileName(''), 'memorial-tile.png');
    assert.equal(api.sanitizeFileName(null), 'memorial-tile.png');
    assert.doesNotMatch(api.sanitizeFileName('a/b\\c:d'), /[\\/:]/);
  });

  it('has he/ru/en hints and falls back to Russian for unknown languages', () => {
    const { api } = loadWhatsAppShare();
    ['he', 'ru', 'en'].forEach((lang) => {
      const hints = api.hintMessages(lang);
      assert.ok(hints.copied && hints.downloaded && hints.failed, `${lang} hints missing`);
    });
    assert.match(api.hintMessages('he').copied, /Ctrl\+V/);
    assert.match(api.hintMessages('ru').copied, /Ctrl\+V/);
    assert.match(api.hintMessages('en').downloaded, /attach/i);
    assert.equal(api.normalizeLang('he-IL'), 'he');
    assert.equal(api.normalizeLang('en'), 'en');
    assert.equal(api.normalizeLang('de'), 'ru');
    assert.equal(api.normalizeLang(undefined), 'ru');
  });

  it('exposes the same API on window and on module.exports', () => {
    const { api, windowApi } = loadWhatsAppShare();
    assert.equal(typeof api.shareToWhatsApp, 'function');
    assert.equal(typeof windowApi.shareToWhatsApp, 'function');
    assert.equal(typeof windowApi.buildWhatsAppWebUrl, 'function');
  });
});

describe('1.40.0 I86 whatsapp-share: behaviour', () => {
  function makeSandbox(overrides = {}) {
    const opened = [];
    const downloaded = [];
    const toasts = [];
    const shareCalls = [];
    const clipboardWrites = [];

    const button = {
      attrs: { 'data-share-image': '/admin/demo/yahrzeit/tile/7.png', 'data-share-text': 'שלום' },
      getAttribute(name) { return this.attrs[name] || null; },
      setAttribute(name, value) { this.attrs[name] = value; },
      removeAttribute(name) { delete this.attrs[name]; },
      closest() { return null; },
    };

    const sandbox = {
      module: { exports: {} },
      fetch: async () => ({
        ok: true,
        blob: async () => ({ type: 'image/png', size: 8 }),
      }),
      File: function File(parts, name, opts) {
        this.parts = parts;
        this.name = name;
        this.type = (opts && opts.type) || '';
      },
      ClipboardItem: function ClipboardItem(map) { this.map = map; },
      navigator: {
        canShare: () => true,
        share: async (payload) => { shareCalls.push(payload); },
        clipboard: {
          write: async (items) => { clipboardWrites.push(items); },
        },
      },
      setTimeout: () => 0,
      URL: { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} },
      document: {
        documentElement: { getAttribute: () => 'he' },
        body: {
          appendChild: () => {},
        },
        getElementById: () => null,
        createElement: (tag) => {
          const el = {
            tagName: tag,
            style: { cssText: '' },
            setAttribute() {},
            remove() {},
            addEventListener() {},
            click() { downloaded.push({ tag, href: el.href, download: el.download }); },
          };
          return el;
        },
        querySelector: () => null,
        addEventListener: () => {},
      },
      window: null,
    };
    sandbox.window = sandbox;
    sandbox.window.open = (url, target) => { opened.push({ url, target }); };
    sandbox.window.setTimeout = () => 0;
    Object.assign(sandbox, overrides);

    const api = (() => {
      vm.runInNewContext(read('public/js/whatsapp-share.js'), sandbox, { filename: 'whatsapp-share.js' });
      return sandbox.module.exports;
    })();

    return { api, opened, downloaded, toasts, shareCalls, clipboardWrites, button, sandbox };
  }

  it('uses the native share sheet with the PNG file when the platform can share files', async () => {
    const { api, opened, shareCalls, downloaded, sandbox } = makeSandbox();
    const originalAppendChild = sandbox.document.body.appendChild;
    sandbox.document.body.appendChild = (node) => {
      if (node && node.textContent) sandbox.__toast = node.textContent;
      originalAppendChild(node);
    };

    const status = await api.shareToWhatsApp({
      imageUrl: '/admin/demo/yahrzeit/tile/7.png',
      text: 'שלום',
      link: 'https://example.org/s/demo',
      fileName: 'אברהם',
    });

    assert.equal(status, 'shared');
    assert.equal(shareCalls.length, 1);
    assert.equal(shareCalls[0].files.length, 1);
    assert.equal(shareCalls[0].files[0].name, 'אברהם-tile.png');
    assert.equal(shareCalls[0].text, 'שלום\nhttps://example.org/s/demo');
    // the native sheet already delivers the image, so nothing is downloaded and no tab opens
    assert.equal(downloaded.length, 0);
    assert.equal(opened.length, 0);
  });

  it('silently ignores the user cancelling the native share sheet', async () => {
    const { api, opened, downloaded, sandbox } = makeSandbox();
    sandbox.navigator.share = async () => {
      const err = new Error('cancelled');
      err.name = 'AbortError';
      throw err;
    };
    const status = await api.shareToWhatsApp({
      imageUrl: '/admin/demo/yahrzeit/tile/7.png',
      text: 'hi',
      link: 'https://example.org/s/demo',
    });
    assert.equal(status, 'cancelled');
    assert.equal(opened.length, 0);
    assert.equal(downloaded.length, 0);
  });

  it('desktop: copies the image, opens WhatsApp Web with the text and shows a text hint', async () => {
    const toasts = [];
    const { api, opened, downloaded, clipboardWrites, sandbox } = makeSandbox();
    sandbox.navigator.canShare = () => false;
    sandbox.document.body.appendChild = (node) => { if (node && node.textContent) toasts.push(node.textContent); };

    const status = await api.shareToWhatsApp({
      imageUrl: '/admin/demo/yahrzeit/tile/7.png',
      text: 'שלום',
      link: 'https://example.org/s/demo',
      fileName: 'אברהם',
    });

    assert.equal(status, 'copied');
    assert.equal(clipboardWrites.length, 1);
    assert.ok(clipboardWrites[0][0].map['image/png']);
    assert.equal(downloaded.length, 0);
    assert.equal(opened.length, 1);
    assert.equal(opened[0].url, 'https://web.whatsapp.com/send?text=' + encodeURIComponent('שלום\nhttps://example.org/s/demo'));
    assert.equal(opened[0].target, '_blank');
    // the hint is plain text (not colour only) and is announced politely
    assert.equal(toasts.length, 1);
    assert.match(toasts[0], /Ctrl\+V/);
  });

  it('desktop: downloads the PNG when the clipboard refuses it', async () => {
    const toasts = [];
    const { api, opened, downloaded, sandbox } = makeSandbox();
    sandbox.navigator.canShare = () => false;
    sandbox.navigator.clipboard = { write: async () => { throw new Error('denied'); } };
    sandbox.document.body.appendChild = (node) => { if (node && node.textContent) toasts.push(node.textContent); };

    const status = await api.shareToWhatsApp({
      imageUrl: '/admin/demo/yahrzeit/tile/7.png',
      text: 'x',
      link: 'https://example.org/s/demo',
      fileName: 'Doe',
    });

    assert.equal(status, 'downloaded');
    assert.equal(downloaded.length, 1);
    assert.equal(downloaded[0].download, 'Doe-tile.png');
    assert.equal(opened.length, 1);
    // Hebrew page (document.dir/lang) → Hebrew "image downloaded — attach it" hint
    assert.match(toasts[0], /צרפו/);
  });

  it('still opens WhatsApp Web with the text when the tile cannot be fetched', async () => {
    const toasts = [];
    const { api, opened, sandbox } = makeSandbox();
    sandbox.fetch = async () => { throw new Error('offline'); };
    sandbox.document.body.appendChild = (node) => { if (node && node.textContent) toasts.push(node.textContent); };

    const status = await api.shareToWhatsApp({
      imageUrl: '/admin/demo/yahrzeit/tile/7.png',
      text: 'x',
      link: 'https://example.org/s/demo',
    });

    assert.equal(status, 'text-only');
    assert.equal(opened.length, 1);
    assert.equal(toasts.length, 1);
  });

  it('accepts a plain hint string as well as per-outcome overrides', async () => {
    const toasts = [];
    const { api, sandbox } = makeSandbox();
    sandbox.navigator.canShare = () => false;
    sandbox.document.body.appendChild = (node) => { if (node && node.textContent) toasts.push(node.textContent); };
    await api.shareToWhatsApp({
      imageUrl: '/admin/demo/yahrzeit/tile/7.png',
      text: 'x',
      link: 'https://example.org/s/demo',
      hint: 'Image copied - paste it in WhatsApp (Ctrl+V)',
    });
    assert.deepEqual(toasts, ['Image copied - paste it in WhatsApp (Ctrl+V)']);
  });
});

describe('1.40.0 I86 whatsapp-share: wiring', () => {
  it('every tile-share surface loads the script and shows a labelled WhatsApp button', () => {
    const adminRoutes = read('routes/admin.js');
    ['admin/people', 'admin/home', 'admin/yahrzeit'].forEach((view) => {
      assert.match(adminRoutes, new RegExp(`'${view}': \\[[^\\]]*whatsapp-share\\.js`), `${view} missing whatsapp-share.js`);
    });

    const button = read('views/partials/admin-whatsapp-share-button.handlebars');
    assert.match(button, /data-whatsapp-share/);
    assert.match(button, /adminIcon 'whatsapp'/);
    assert.match(button, /t 'yahrzeit_share_whatsapp'/);

    // yahrzeit list: a share button per prepared message (regular + missed-this-week lists) and,
    // for a person without contacts, one in the card actions instead.
    const yahrzeitView = read('views/admin/yahrzeit.handlebars');
    assert.equal((yahrzeitView.match(/\{\{> admin-whatsapp-share-button/g) || []).length, 4);
    assert.match(yahrzeitView, /\{\{#unless this\.contacts\.length\}\}[\s\S]*admin-whatsapp-share-button/);
    assert.match(yahrzeitView, /data-board-url="\/s\/\{\{synagogue\.slug\}\}"/);

    // person card modal
    assert.match(read('views/partials/admin-person-card-modal.handlebars'), /data-whatsapp-share/);

    // home screen + dashboard upcoming reminders
    assert.match(read('views/admin/home.handlebars'), /\{\{> admin-yahrzeit-reminders\}\}/);
    assert.match(read('views/admin/dashboard.handlebars'), /\{\{> admin-yahrzeit-reminders\}\}/);
    assert.match(read('views/partials/admin-yahrzeit-reminders.handlebars'), /admin-whatsapp-share-button/);
  });

  it('translates the new labels in he, ru and en', () => {
    const translations = require('../lib/admin-translations').translations;
    ['he', 'ru', 'en'].forEach((lang) => {
      ['yahrzeit_share_whatsapp', 'yahrzeit_share_hint_copied', 'yahrzeit_share_hint_downloaded',
        'yahrzeit_share_hint_failed', 'yahrzeit_share_focused', 'yahrzeit_share_reminders_title',
      ].forEach((key) => {
        const value = translations[lang] && translations[lang][key];
        assert.ok(value && String(value).trim(), `${lang} missing ${key}`);
      });
    });
  });

  it('entries carry the tile PNG and the community board URL for sharing', () => {
    const { buildContactMessageEntry } = require('../lib/yahrzeit-reminders');
    const entry = buildContactMessageEntry({
      slug: 'demo',
      language: 'he',
      adminLanguage: 'he',
      publicSubmission: {},
    }, {
      id: 12,
      name: 'אברהם כהן',
      gregorianDateOfDeath: { year: 1990, month: 11, date: 10 },
      yahrzeitIsHebrewToday: true,
    }, { adminLanguage: 'he' });

    assert.equal(entry.tileImageUrl, '/admin/demo/yahrzeit/tile/12.png');
    assert.equal(entry.boardShareUrl, '/s/demo');
    assert.ok(entry.preparedMessage);
  });

  it('upcoming rows carry the share data (home / dashboard lists)', () => {
    const { buildUpcomingYahrzeitRows } = require('../lib/admin-upcoming-yahrzeit');
    const rows = buildUpcomingYahrzeitRows({
      slug: 'demo',
      location: { timezone: 'Asia/Jerusalem' },
      yahrzeitReminders: { includeHebrewYahrzeit: false },
      people: [{ id: 3, name: 'Person', gregorianDateOfDeath: { year: 1990, month: 10, date: 14 } }],
    }, new Date('2026-10-12T12:00:00+03:00'), 7, 'he');

    assert.equal(rows.length, 1);
    assert.equal(rows[0].tileImageUrl, '/admin/demo/yahrzeit/tile/3.png');
    assert.equal(rows[0].boardShareUrl, '/s/demo');
    assert.equal(rows[0].messageUrl, '/admin/demo/people/message/3.json');
  });

  it('reminder links open the yahrzeit page focused on that person', () => {
    const { buildAdminReminderBody } = require('../lib/yahrzeit-messages');
    const body = buildAdminReminderBody({
      synagogueName: 'Demo',
      synagogueSlug: 'demo',
      entries: [{ id: 9, name: 'Person', contact: { name: 'Kin' } }],
      lang: 'en',
    });
    assert.match(body, /\/admin\/demo\/yahrzeit\?share=9#person-9/);

    const { buildYahrzeitPushPayload } = require('../lib/yahrzeit-push');
    const payload = buildYahrzeitPushPayload([{ person: { id: 9, name: 'Person' }, date: new Date(2026, 10, 10) }], {
      today: true,
      slug: 'demo',
    });
    assert.equal(payload.url, '/admin/demo/yahrzeit?share=9');
    // without a community slug the old /admin/ fallback is kept
    assert.equal(buildYahrzeitPushPayload([{ person: { id: 9, name: 'P' }, date: new Date() }]).url, '/admin/');
  });

  it('the admin yahrzeit page highlights the share button for ?share=<id>', () => {
    const js = read('public/js/admin-yahrzeit.js');
    assert.match(js, /share=\(\[\^&\]\+\)/);
    assert.match(js, /is-share-highlight/);
    assert.match(js, /highlightShareTarget/);
    // a person from a push reminder may not be in today's list -> open their card instead
    assert.match(js, /openPersonCard\(person\)[\s\S]*personCardShareBtn/);
    // a native share sheet needs a gesture: the code must focus, never call navigator.share itself
    assert.doesNotMatch(js, /navigator\.share\(/);
  });
});

describe('1.40.0 I86 CSP support', () => {
  it('admin policy allows blob: images and same-origin fetch', () => {
    const { ADMIN_POLICY, PUBLIC_REPORT_POLICY } = require('../lib/csp');
    [ADMIN_POLICY, PUBLIC_REPORT_POLICY].forEach((policy) => {
      assert.match(policy, /img-src[^;]*blob:/);
      assert.match(policy, /connect-src 'self'/);
    });
    // WhatsApp Web opens in a new tab; top-level navigation is not restricted by CSP here.
    assert.doesNotMatch(ADMIN_POLICY, /navigate-to/);
  });
});
