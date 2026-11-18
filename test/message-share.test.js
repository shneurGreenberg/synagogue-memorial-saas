const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function loadMessageShare() {
  const sandbox = { module: { exports: {} }, window: {} };
  sandbox.window.window = sandbox.window;
  vm.runInNewContext(read('public/js/message-share.js'), sandbox, { filename: 'message-share.js' });
  return { api: sandbox.module.exports, windowApi: sandbox.window.MessageShare, legacy: sandbox.window.WhatsAppShare };
}

describe('1.42.0 I90 message-share: pure helpers', () => {
  it('joins the message text and the board link with a single newline', () => {
    const { api } = loadMessageShare();
    assert.equal(api.joinShareText('Hello', 'https://example.org/s/a'), 'Hello\nhttps://example.org/s/a');
    assert.equal(api.joinShareText('Hello\n', '  https://example.org/s/a  '), 'Hello\nhttps://example.org/s/a');
    assert.equal(api.joinShareText('', 'https://example.org/s/a'), 'https://example.org/s/a');
    assert.equal(api.joinShareText('Hello', ''), 'Hello');
    assert.equal(api.joinShareText(null, null), '');
  });

  it('sanitizes the file name and always ends with -tile.png', () => {
    const { api } = loadMessageShare();
    assert.equal(api.sanitizeFileName('אברהם כהן'), 'אברהם_כהן-tile.png');
    assert.equal(api.sanitizeFileName('John / Doe'), 'John_Doe-tile.png');
    assert.equal(api.sanitizeFileName(''), 'memorial-tile.png');
    assert.equal(api.sanitizeFileName(null), 'memorial-tile.png');
    assert.doesNotMatch(api.sanitizeFileName('a/b\\c:d'), /[\\/:]/);
  });

  it('has he/ru/en hints and falls back to Russian for unknown languages', () => {
    const { api } = loadMessageShare();
    ['he', 'ru', 'en'].forEach((lang) => {
      const hints = api.hintMessages(lang);
      assert.ok(hints.copied && hints.downloaded && hints.failed, `${lang} hints missing`);
      assert.doesNotMatch(hints.copied + hints.downloaded + hints.failed, /whatsapp/i);
    });
    assert.match(api.hintMessages('he').copied, /Ctrl\+V/);
    assert.match(api.hintMessages('ru').copied, /Ctrl\+V/);
    assert.match(api.hintMessages('en').downloaded, /any app/i);
    assert.equal(api.normalizeLang('he-IL'), 'he');
    assert.equal(api.normalizeLang('en'), 'en');
    assert.equal(api.normalizeLang('de'), 'ru');
    assert.equal(api.normalizeLang(undefined), 'ru');
  });

  it('exposes the same API on window.MessageShare and on module.exports', () => {
    const { api, windowApi, legacy } = loadMessageShare();
    assert.equal(typeof api.shareMessage, 'function');
    assert.equal(typeof windowApi.shareMessage, 'function');
    assert.equal(legacy.shareMessage, windowApi.shareMessage);
    assert.equal(api.shareToWhatsApp, api.shareMessage);
    assert.doesNotMatch(read('public/js/message-share.js'), /web\.whatsapp\.com/);
  });
});

describe('1.42.0 I90 message-share: behaviour', () => {
  function makeSandbox(overrides = {}) {
    const opened = [];
    const downloaded = [];
    const shareCalls = [];
    const clipboardWrites = [];
    const clipboardTexts = [];

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
          writeText: async (value) => { clipboardTexts.push(value); },
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
      vm.runInNewContext(read('public/js/message-share.js'), sandbox, { filename: 'message-share.js' });
      return sandbox.module.exports;
    })();

    return { api, opened, downloaded, shareCalls, clipboardWrites, clipboardTexts, sandbox };
  }

  it('uses the native share sheet with the PNG, the text and the link when the platform can share files', async () => {
    const { api, opened, shareCalls, downloaded } = makeSandbox();

    const status = await api.shareMessage({
      imageUrl: '/admin/demo/yahrzeit/tile/7.png',
      text: 'שלום',
      link: 'https://example.org/s/demo',
      fileName: 'אברהם',
    });

    assert.equal(status, 'shared');
    assert.equal(shareCalls.length, 1);
    assert.equal(shareCalls[0].files.length, 1);
    assert.equal(shareCalls[0].files[0].name, 'אברהם-tile.png');
    assert.equal(shareCalls[0].text, 'שלום');
    assert.equal(shareCalls[0].url, 'https://example.org/s/demo');
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
    const status = await api.shareMessage({
      imageUrl: '/admin/demo/yahrzeit/tile/7.png',
      text: 'hi',
      link: 'https://example.org/s/demo',
    });
    assert.equal(status, 'cancelled');
    assert.equal(opened.length, 0);
    assert.equal(downloaded.length, 0);
  });

  it('shares text and link without the file, and copies the image, when files cannot be shared', async () => {
    const toasts = [];
    const { api, opened, downloaded, shareCalls, clipboardWrites, clipboardTexts, sandbox } = makeSandbox();
    sandbox.navigator.canShare = () => false;
    sandbox.document.body.appendChild = (node) => { if (node && node.textContent) toasts.push(node.textContent); };

    const status = await api.shareMessage({
      imageUrl: '/admin/demo/yahrzeit/tile/7.png',
      text: 'שלום',
      link: 'https://example.org/s/demo',
      fileName: 'אברהם',
    });

    assert.equal(status, 'copied');
    assert.equal(shareCalls.length, 1);
    assert.equal(shareCalls[0].files, undefined);
    assert.equal(shareCalls[0].text, 'שלום');
    assert.equal(shareCalls[0].url, 'https://example.org/s/demo');
    assert.equal(clipboardWrites.length, 1);
    assert.ok(clipboardWrites[0][0].map['image/png']);
    assert.equal(clipboardTexts.length, 0);
    assert.equal(downloaded.length, 0);
    assert.equal(opened.length, 0);
    assert.equal(toasts.length, 1);
    assert.match(toasts[0], /Ctrl\+V/);
  });

  it('desktop: copies the image and the text, and shows a text hint, without opening WhatsApp', async () => {
    const toasts = [];
    const { api, opened, downloaded, shareCalls, clipboardWrites, clipboardTexts, sandbox } = makeSandbox();
    delete sandbox.navigator.share;
    delete sandbox.navigator.canShare;
    sandbox.document.body.appendChild = (node) => { if (node && node.textContent) toasts.push(node.textContent); };

    const status = await api.shareMessage({
      imageUrl: '/admin/demo/yahrzeit/tile/7.png',
      text: 'שלום',
      link: 'https://example.org/s/demo',
      fileName: 'אברהם',
    });

    assert.equal(status, 'copied');
    assert.equal(shareCalls.length, 0);
    assert.equal(clipboardWrites.length, 1);
    assert.ok(clipboardWrites[0][0].map['image/png']);
    assert.deepEqual(clipboardTexts, ['שלום\nhttps://example.org/s/demo']);
    assert.equal(downloaded.length, 0);
    assert.equal(opened.length, 0);
    assert.equal(toasts.length, 1);
    assert.match(toasts[0], /Ctrl\+V/);
    assert.match(toasts[0], /יישום|приложен|any app/i);
  });

  it('desktop: downloads the PNG when the clipboard refuses it', async () => {
    const toasts = [];
    const { api, opened, downloaded, clipboardTexts, sandbox } = makeSandbox();
    delete sandbox.navigator.share;
    sandbox.navigator.clipboard = {
      write: async () => { throw new Error('denied'); },
      writeText: async (value) => { clipboardTexts.push(value); },
    };
    sandbox.document.body.appendChild = (node) => { if (node && node.textContent) toasts.push(node.textContent); };

    const status = await api.shareMessage({
      imageUrl: '/admin/demo/yahrzeit/tile/7.png',
      text: 'x',
      link: 'https://example.org/s/demo',
      fileName: 'Doe',
    });

    assert.equal(status, 'downloaded');
    assert.equal(downloaded.length, 1);
    assert.equal(downloaded[0].download, 'Doe-tile.png');
    assert.deepEqual(clipboardTexts, ['x\nhttps://example.org/s/demo']);
    assert.equal(opened.length, 0);
    assert.match(toasts[0], /הורדה/);
  });

  it('copies the text when the tile cannot be fetched and sharing is unavailable', async () => {
    const toasts = [];
    const { api, opened, clipboardTexts, sandbox } = makeSandbox();
    delete sandbox.navigator.share;
    sandbox.fetch = async () => { throw new Error('offline'); };
    sandbox.document.body.appendChild = (node) => { if (node && node.textContent) toasts.push(node.textContent); };

    const status = await api.shareMessage({
      imageUrl: '/admin/demo/yahrzeit/tile/7.png',
      text: 'x',
      link: 'https://example.org/s/demo',
    });

    assert.equal(status, 'text-only');
    assert.equal(opened.length, 0);
    assert.deepEqual(clipboardTexts, ['x\nhttps://example.org/s/demo']);
    assert.equal(toasts.length, 1);
  });

  it('accepts a plain hint string as well as per-outcome overrides', async () => {
    const toasts = [];
    const { api, sandbox } = makeSandbox();
    delete sandbox.navigator.share;
    sandbox.document.body.appendChild = (node) => { if (node && node.textContent) toasts.push(node.textContent); };
    await api.shareMessage({
      imageUrl: '/admin/demo/yahrzeit/tile/7.png',
      text: 'x',
      link: 'https://example.org/s/demo',
      hint: 'Image and message copied — paste them into any app (Ctrl+V)',
    });
    assert.deepEqual(toasts, ['Image and message copied — paste them into any app (Ctrl+V)']);
  });
});

describe('1.42.0 I90 message-share: wiring', () => {
  it('every tile-share surface loads the script and shows one labelled send-message button', () => {
    const adminRoutes = read('routes/admin.js');
    ['admin/people', 'admin/home', 'admin/yahrzeit', 'admin/dashboard'].forEach((view) => {
      assert.match(adminRoutes, new RegExp(`'${view}': \\[[^\\]]*message-share\\.js`), `${view} missing message-share.js`);
    });

    const button = read('views/partials/admin-message-share-button.handlebars');
    assert.match(button, /data-message-share/);
    assert.match(button, /adminIcon 'share'/);
    assert.match(button, /t 'yahrzeit_share_message'/);
    assert.doesNotMatch(button, /whatsapp/i);

    const yahrzeitView = read('views/admin/yahrzeit.handlebars');
    assert.equal((yahrzeitView.match(/\{\{> admin-message-share-button/g) || []).length, 4);
    assert.match(yahrzeitView, /\{\{#unless this\.contacts\.length\}\}[\s\S]*admin-message-share-button/);
    assert.match(yahrzeitView, /data-board-url="\/s\/\{\{synagogue\.slug\}\}"/);

    assert.match(read('views/partials/admin-person-card-modal.handlebars'), /data-message-share/);
    assert.match(read('views/partials/admin-person-card-modal.handlebars'), /adminIcon 'share'/);

    assert.match(read('views/admin/home.handlebars'), /\{\{> admin-yahrzeit-reminders\}\}/);
    assert.match(read('views/admin/dashboard.handlebars'), /\{\{> admin-yahrzeit-reminders\}\}/);
    assert.match(read('views/partials/admin-yahrzeit-reminders.handlebars'), /admin-message-share-button/);

    assert.equal(require('../lib/admin-icons').ICONS.share.length > 20, true);
    assert.match(read('public/js/admin-icons.js'), /share:/);
  });

  it('translates the new labels in he, ru and en', () => {
    const translations = require('../lib/admin-translations').translations;
    ['he', 'ru', 'en'].forEach((lang) => {
      ['yahrzeit_share_message', 'yahrzeit_share_hint_copied', 'yahrzeit_share_hint_downloaded',
        'yahrzeit_share_hint_failed', 'yahrzeit_share_focused', 'yahrzeit_share_reminders_title',
      ].forEach((key) => {
        const value = translations[lang] && translations[lang][key];
        assert.ok(value && String(value).trim(), `${lang} missing ${key}`);
        assert.doesNotMatch(String(value), /whatsapp|וואטסאפ|ватсап/i);
      });
    });
    assert.equal(translations.he.yahrzeit_share_message, 'שליחת הודעה');
    assert.equal(translations.ru.yahrzeit_share_message, 'Отправить сообщение');
    assert.equal(translations.en.yahrzeit_share_message, 'Send message');
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
    assert.equal(buildYahrzeitPushPayload([{ person: { id: 9, name: 'P' }, date: new Date() }]).url, '/admin/');
  });

  it('the admin yahrzeit page highlights the share button for ?share=<id>', () => {
    const js = read('public/js/admin-yahrzeit.js');
    assert.match(js, /share=\(\[\^&\]\+\)/);
    assert.match(js, /is-share-highlight/);
    assert.match(js, /highlightShareTarget/);
    assert.match(js, /data-message-share/);
    assert.match(js, /openPersonCard\(person\)[\s\S]*personCardShareBtn/);
    assert.doesNotMatch(js, /navigator\.share\(/);
  });
});

describe('1.42.0 I90 CSP support', () => {
  it('admin policy allows blob: images and same-origin fetch', () => {
    const { ADMIN_POLICY, PUBLIC_REPORT_POLICY } = require('../lib/csp');
    [ADMIN_POLICY, PUBLIC_REPORT_POLICY].forEach((policy) => {
      assert.match(policy, /img-src[^;]*blob:/);
      assert.match(policy, /connect-src 'self'/);
    });
  });
});
