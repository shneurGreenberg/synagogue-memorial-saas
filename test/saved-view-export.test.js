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

const http = require('node:http');
const { buildExportContentDisposition } = require('../lib/saved-view-portable');
describe('saved-view export header', () => {
  it('is header-safe with a Hebrew name', () => {
    const h = buildExportContentDisposition({ id: 'abc123', name: 'תצוגת "חורף" / ראשית' });
    assert.ok(/^[\x20-\x7e]+$/.test(h));
    assert.ok(h.includes('filename="saved-view-abc123.json"'));
    assert.ok(h.includes("filename*=UTF-8''"));
    assert.ok(decodeURIComponent(h.split("UTF-8''")[1]).startsWith('תצוגת'));
    const res = new http.ServerResponse(new http.IncomingMessage(null));
    assert.doesNotThrow(() => res.setHeader('Content-Disposition', h));
  });
});
