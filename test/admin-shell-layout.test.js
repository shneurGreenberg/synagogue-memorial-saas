const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { resolveWeeklyKaddishEntries } = require('../lib/admin-yahrzeit-persisted');
const { toPublicBoardPayload } = require('../lib/public-board');
const {
  safeAdminNextPath,
  safeAdminLogoutNext,
  adminNextSlug,
} = require('../lib/admin-session-slug');

const ROOT = path.join(__dirname, '..');

describe('admin shell & board layout', () => {
  it('safe admin next paths for login redirect', () => {
    const next = '/admin/novosibirsk/dashboard';
    assert.equal(safeAdminNextPath(next), next);
    assert.equal(adminNextSlug(next), 'novosibirsk');
    assert.equal(safeAdminNextPath('https://evil.example/admin/foo'), '');
    assert.equal(safeAdminNextPath('//evil.example/admin/foo'), '');
  });

  it('logout next accepts admin login URLs with query', () => {
    const login = '/admin/login?slug=beta&next=%2Fadmin%2Fbeta%2Fdashboard';
    assert.equal(safeAdminLogoutNext(login), login);
  });

  it('weekly kaddish entries stay empty when master toggle is off', () => {
    const synagogue = {
      slug: 'demo',
      weeklyKaddishReminderEnabled: false,
      location: { timezone: 'Asia/Jerusalem' },
      yahrzeitReminders: { includeHebrewYahrzeit: false },
      people: [
        {
          id: 1,
          name: 'Shabbat',
          gregorianDateOfDeath: { year: 2020, month: 10, date: 17 },
          contact: { name: 'Son', phone: '+972501' },
        },
      ],
    };
    const result = resolveWeeklyKaddishEntries(synagogue, new Date('2026-10-14T10:00:00Z'));
    assert.equal(result.entries.length, 0);
    assert.equal(result.missingCount, 0);
  });

  it('public board payload includes boardHideSearchAndPager when set', () => {
    const payload = toPublicBoardPayload({
      slug: 'x',
      language: 'ru',
      boardHideSearchAndPager: true,
      people: [],
    });
    assert.equal(payload.boardHideSearchAndPager, true);
  });

  it('ב״ה badge uses logical start positioning in shared CSS', () => {
    const css = fs.readFileSync(path.join(ROOT, 'styles', 'common.scss'), 'utf8');
    assert.match(css, /\.baruch-hashem-badge[\s\S]*inset-inline-start:/);
    assert.doesNotMatch(css, /\.baruch-hashem-badge[\s\S]*\n\s*right:/);
  });

  it('Hebrew board moves fixed ב״ה to inline end via board-lang-he', () => {
    const scss = fs.readFileSync(path.join(ROOT, 'styles', 'home.scss'), 'utf8');
    assert.match(scss, /body\.board-lang-he[\s\S]*\.baruch-hashem-badge:not\(\.baruch-hashem-badge--column\)[\s\S]*inset-inline-end:/);
  });

  it('wrong-community page includes beh-badge partial', () => {
    const page = fs.readFileSync(
      path.join(ROOT, 'views', 'admin', 'wrong-community.handlebars'),
      'utf8',
    );
    assert.match(page, /\{\{>\s*beh-badge\s*\}\}/);
  });
});
