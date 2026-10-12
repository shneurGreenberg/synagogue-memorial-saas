const test = require('node:test');
const assert = require('node:assert/strict');
const { ICONS, renderAdminIcon } = require('../lib/admin-icons');

test('scan icon renders for grave-scan button', () => {
  assert.ok(ICONS.scan);
  const html = renderAdminIcon('scan', 'btn-admin-inline-icon');
  assert.match(html, /btn-admin-inline-icon/);
  assert.match(html, /viewBox="0 0 24 24"/);
});
