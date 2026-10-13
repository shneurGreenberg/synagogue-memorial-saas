const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildSavedViewExport } = require('../lib/saved-view-portable');

describe('saved-view export', () => {
  it('builds portable JSON payload for download', () => {
    const payload = buildSavedViewExport({
      id: 'view-1',
      name: 'Winter theme',
      snapshot: { theme: { primaryColor: '#112233' } },
    });

    assert.ok(payload.format);
    assert.ok(payload.formatVersion >= 1);
    assert.equal(payload.name, 'Winter theme');
    assert.deepEqual(payload.snapshot.theme.primaryColor, '#112233');
    assert.ok(JSON.stringify(payload).includes('Winter theme'));
  });
});
