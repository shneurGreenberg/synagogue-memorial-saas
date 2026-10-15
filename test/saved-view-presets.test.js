const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  PRESET_VIEW_NAMES,
  listPresetSavedViews,
  mergePresetSavedViews,
  resolveDefaultActiveSavedViewId,
  presetViewId,
} = require('../lib/saved-view-presets');
const { pickDesignFromSnapshot } = require('../lib/saved-view-design');

describe('saved-view presets for new communities', () => {
  it('defines four Hebrew preset names', () => {
    assert.deepEqual(PRESET_VIEW_NAMES, ['בסיסי', 'אדום', 'עץ', 'אבן']);
  });

  it('builds design-only snapshots from repo theme assets', () => {
    const presets = listPresetSavedViews();
    assert.equal(presets.length, 4);

    const basic = presets.find((view) => view.name === 'בסיסי');
    assert.equal(basic.snapshot.theme.backgroundImage, 'brickwall.jpg');
    assert.equal(basic.snapshot.theme.tilesBackground, 'wood2.png');
    assert.equal(basic.snapshot.titles, undefined);
    assert.equal(basic.snapshot.boardFeatures, undefined);

    const stone = presets.find((view) => view.name === 'אבן');
    assert.equal(stone.snapshot.theme.backgroundImage, 'brickwall.jpg');

    const tree = presets.find((view) => view.name === 'עץ');
    assert.equal(tree.snapshot.theme.backgroundImage, 'wood2.png');

    const red = presets.find((view) => view.name === 'אדום');
    assert.equal(red.snapshot.theme.backgroundImage, 'gold.png');
  });

  it('merge is idempotent and keeps custom views', () => {
    const custom = {
      id: 'custom-1',
      name: 'מותאם',
      savedAt: new Date(),
      screenshot: '',
      snapshot: pickDesignFromSnapshot({ theme: { primaryColor: '#112233' } }),
    };
    const first = mergePresetSavedViews([custom]);
    assert.equal(first.length, 5);
    assert.ok(first.some((view) => view.name === 'מותאם'));
    assert.ok(first.some((view) => view.name === 'בסיסי'));

    const second = mergePresetSavedViews(first);
    assert.equal(second.length, 5);
    assert.deepEqual(
      second.map((view) => view.name).sort(),
      first.map((view) => view.name).sort(),
    );
  });

  it('selects בסיסי as default active view', () => {
    const merged = mergePresetSavedViews([]);
    const activeId = resolveDefaultActiveSavedViewId(merged);
    assert.equal(activeId, presetViewId('בסיסי'));
  });
});

describe('beh badge typography', () => {
  const GERSHAYIM = 'ב״ה';

  it('partial and board component use Hebrew gershayim', () => {
    const partial = fs.readFileSync(
      path.join(__dirname, '..', 'views', 'partials', 'beh-badge.handlebars'),
      'utf8',
    );
    const component = fs.readFileSync(
      path.join(__dirname, '..', 'client', 'src', 'components', 'BaruchHashemBadge.jsx'),
      'utf8',
    );
    const adminLayout = fs.readFileSync(
      path.join(__dirname, '..', 'views', 'layouts', 'admin.handlebars'),
      'utf8',
    );

    assert.ok(partial.includes(GERSHAYIM));
    assert.ok(component.includes(GERSHAYIM));
    assert.ok(adminLayout.includes(GERSHAYIM));
    assert.equal(partial.includes('בה</div>'), false);
  });
});
