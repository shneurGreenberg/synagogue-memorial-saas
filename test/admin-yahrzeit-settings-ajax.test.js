const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('admin yahrzeit settings (Y11)', () => {
  it('yahrzeit page loads person card script and auto-save UI', () => {
    const adminRoutes = fs.readFileSync(path.join(__dirname, '..', 'routes', 'admin.js'), 'utf8');
    assert.match(adminRoutes, /'admin\/yahrzeit': \['admin-person-card\.js', 'admin-yahrzeit\.js'/);

    const template = fs.readFileSync(path.join(__dirname, '..', 'views', 'admin', 'yahrzeit.handlebars'), 'utf8');
    assert.match(template, /yahrzeitSettingsSaved/);
    assert.doesNotMatch(template, /btn-admin-with-icon">\{\{\{adminIcon 'save'\}\}\}/);

    const js = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'admin-yahrzeit.js'), 'utf8');
    assert.match(js, /yahrzeitSettingsAutoSave/);
    assert.match(js, /X-Requested-With': 'fetch'/);
  });

  it('settings route returns JSON for fetch saves', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'routes', 'admin.js'), 'utf8');
    const block = source.slice(source.indexOf("router.post('/:slug/yahrzeit/settings'"));
    assert.match(block, /X-Requested-With'\) === 'fetch'/);
    assert.match(block, /res\.json\(\{ ok: true \}\)/);
  });
});
