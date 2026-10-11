const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  nextPublishedVersion,
  resolvePublishedVersion,
  normalizeScreenReport,
  recordBoardScreen,
  summarizeBoardScreens,
} = require('../lib/board-publish');

describe('published board version', () => {
  it('bumps a missing version from the default screens already loaded', () => {
    assert.equal(resolvePublishedVersion(undefined), 1);
    assert.equal(resolvePublishedVersion(0), 1);
    assert.equal(nextPublishedVersion(undefined), 2);
    assert.equal(nextPublishedVersion(4), 5);
  });

  it('rejects a presence report without a stable screen id', () => {
    assert.equal(normalizeScreenReport({}), null);
    assert.equal(normalizeScreenReport({ screenId: 'short', publishedVersion: 2 }), null);
    assert.deepEqual(
      normalizeScreenReport({
        screenId: 'screen-board-1',
        client: 'presentation',
        publishedVersion: 3,
        label: 'Lobby TV',
      }),
      {
        screenId: 'screen-board-1',
        client: 'presentation',
        label: 'Lobby TV',
        publishedVersion: 3,
      },
    );
  });

  it('counts screens that reported the new version and those still behind', () => {
    const now = new Date('2026-10-11T12:00:00Z');
    let screens = recordBoardScreen([], {
      screenId: 'screen-board-1',
      client: 'board',
      publishedVersion: 5,
      label: 'Hall',
    }, now);
    screens = recordBoardScreen(screens, {
      screenId: 'screen-side-01',
      client: 'sidebar',
      publishedVersion: 4,
      label: 'Android',
    }, now);
    screens = recordBoardScreen(screens, {
      screenId: 'screen-pres-01',
      client: 'nope',
      publishedVersion: 5,
    }, now);

    const summary = summarizeBoardScreens(screens, 5, now);
    assert.equal(summary.publishedVersion, 5);
    assert.equal(summary.recentCount, 3);
    assert.equal(summary.onPublishedVersion, 2);
    assert.equal(summary.pendingCount, 1);
    assert.equal(summary.screens.find((screen) => screen.screenId === 'screen-pres-01').client, 'board');

    const stale = recordBoardScreen([], {
      screenId: 'screen-old-0001',
      client: 'board',
      publishedVersion: 5,
    }, new Date(now.getTime() - 10 * 60 * 1000));
    const staleSummary = summarizeBoardScreens(stale, 5, now);
    assert.equal(staleSummary.recentCount, 0);
    assert.equal(staleSummary.onPublishedVersion, 0);
    assert.equal(staleSummary.screens.length, 1);
  });

  it('replaces a screen report instead of duplicating it', () => {
    const first = new Date('2026-10-11T12:00:00Z');
    const second = new Date('2026-10-11T12:01:00Z');
    let screens = recordBoardScreen([], {
      screenId: 'screen-board-1',
      client: 'board',
      publishedVersion: 2,
    }, first);
    screens = recordBoardScreen(screens, {
      screenId: 'screen-board-1',
      client: 'board',
      publishedVersion: 3,
    }, second);

    assert.equal(screens.length, 1);
    assert.equal(screens[0].publishedVersion, 3);
    const summary = summarizeBoardScreens(screens, 3, second);
    assert.equal(summary.onPublishedVersion, 1);
    assert.equal(summary.pendingCount, 0);
  });
});
