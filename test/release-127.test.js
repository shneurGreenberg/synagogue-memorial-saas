const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');
const { buildHealthPayload } = require('../lib/health-payload');
const { mergePreviewPatch } = require('../lib/board-preview');
const { buildUpcomingYahrzeitRows } = require('../lib/admin-upcoming-yahrzeit');

const THEME_STYLES = path.join(__dirname, '..', 'client', 'src', 'components', 'ThemeStyles.jsx');
const BOARD_SUBTITLE = path.join(__dirname, '..', 'client', 'src', 'components', 'BoardTitleSubtitle.jsx');
const JEWISH_PANELS = path.join(__dirname, '..', 'client', 'src', 'components', 'JewishContentPanels.jsx');
const YAHRZEIT_TEMPLATE = path.join(__dirname, '..', 'views', 'admin', 'yahrzeit.handlebars');
const MEMORIAL_BUNDLE = path.join(__dirname, '..', 'public', 'board', 'assets', 'memorial.js');

describe('release 1.27 E1 board subtitle preview styling', () => {
  it('ThemeStyles drives subtitle color, font, weight, and scale via CSS variables', () => {
    const source = fs.readFileSync(THEME_STYLES, 'utf8');
    assert.match(source, /--board-subtitle-color:/);
    assert.match(source, /--board-subtitle-weight:/);
    assert.match(source, /--board-subtitle-font-family:/);
    assert.match(source, /--font-scale-board-subtitle:/);
    assert.match(source, /color: var\(--board-subtitle-color\) !important/);
    assert.match(source, /font-size: calc\(clamp\(14px, 1\.6vw, 26px\) \* var\(--font-scale-board-subtitle\)\)/);
  });

  it('BoardTitleSubtitle relies on board-header-subtitle class without inline theme overrides', () => {
    const source = fs.readFileSync(BOARD_SUBTITLE, 'utf8');
    assert.match(source, /className="board-header-subtitle"/);
    assert.doesNotMatch(source, /style=\{/);
  });

  it('server preview patch applies board subtitle text and theme fields', () => {
    const next = mergePreviewPatch(
      { theme: {}, boardSubtitle: { enabled: false, text: '' } },
      {
        boardSubtitleEnabled: '1',
        boardSubtitleText: 'בית כנסת',
        boardSubtitleColor: '#aabbcc',
        boardSubtitleFont: 'heebo',
        boardSubtitleWeight: '600',
        fontScale_boardSubtitle: '110',
      },
    );
    assert.equal(next.boardSubtitle.enabled, true);
    assert.equal(next.boardSubtitle.text, 'בית כנסת');
    assert.equal(next.theme.boardSubtitleColor, '#aabbcc');
    assert.equal(next.theme.boardSubtitleFont, 'heebo');
    assert.equal(next.theme.boardSubtitleWeight, '600');
    assert.equal(next.theme.fontScales.boardSubtitle, 110);
  });
});

describe('release 1.27 E2 yahrzeit upcoming name navigates to people search', () => {
  it('upcoming rows include URL-encoded searchQuery for each name', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'lib', 'admin-upcoming-yahrzeit.js'),
      'utf8',
    );
    assert.match(source, /searchQuery: encodeURIComponent\(person\.name \|\| ''\)/);
    const synagogue = {
      location: { timezone: 'UTC' },
      yahrzeitReminders: { includeHebrewYahrzeit: true },
      people: [
        {
          id: 'p1',
          name: 'Test Person',
          gregorianDateOfDeath: '2020-01-15',
          hebrewDateOfDeath: '18 Tevet 5780',
        },
      ],
    };
    const rows = buildUpcomingYahrzeitRows(synagogue, new Date('2026-01-15T12:00:00Z'), 7, 'he');
    if (rows.length > 0) {
      assert.equal(rows[0].searchQuery, encodeURIComponent(rows[0].name));
    }
  });

  it('yahrzeit template links upcoming names to admin people list with q=', () => {
    const html = fs.readFileSync(YAHRZEIT_TEMPLATE, 'utf8');
    assert.match(html, /href="\/admin\/\{\{@root\.synagogue\.slug\}\}\/people\?q=\{\{this\.searchQuery\}\}"/);
    assert.match(html, /class="yahrzeit-upcoming-name-link"/);
    assert.doesNotMatch(html, /yahrzeit-upcoming-name-link[^>]*data-person-id/);
  });

  it('admin-yahrzeit.js does not open person card from upcoming name links', () => {
    const js = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'admin-yahrzeit.js'), 'utf8');
    assert.doesNotMatch(js, /yahrzeit-upcoming-name-link/);
  });
});

describe('release 1.27 E3 Tehillim board section labels', () => {
  it('uses Hebrew title תהילים with Russian sublabel Псалмы', () => {
    const source = fs.readFileSync(JEWISH_PANELS, 'utf8');
    assert.match(source, /label="תהילים"/);
    assert.match(source, /sublabel=\{uiLang === 'ru' \? t\('daily_tehillim'\)/);
  });

  it('built memorial bundle includes תהילים and Псалмы for Tehillim tile', () => {
    const bundle = fs.readFileSync(MEMORIAL_BUNDLE, 'utf8');
    assert.match(bundle, /תהילים/);
    assert.match(bundle, /Псалмы/);
  });
});

describe('release 1.27 public health endpoint', () => {
  it('returns JSON with node runtime and app version 1.27.0', () => {
    const payload = buildHealthPayload();
    assert.equal(payload.ok, true);
    assert.match(payload.node, /^v\d+\.\d+\.\d+/);
    assert.equal(payload.version, '1.27.0');
    assert.deepEqual(Object.keys(payload).sort(), ['node', 'ok', 'version']);
  });
});

describe('release 1.27 changelog version', () => {
  it('lists 1.27.0 at the head of CHANGELOG.json', () => {
    const changelog = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.json'), 'utf8'),
    );
    assert.equal(changelog[0].version, '1.27.0');
  });
});
