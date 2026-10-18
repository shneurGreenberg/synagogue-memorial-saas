const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('admin wrong-community layout', () => {
  it('login shell CSS fixes ב״ה badge out of flex flow', () => {
    const scss = fs.readFileSync(path.join(ROOT, 'styles', 'admin.scss'), 'utf8');
    const loginSection = scss.slice(scss.indexOf('// Login page'));
    assert.match(loginSection, /body\.admin-login-page[\s\S]*\.baruch-hashem-badge[\s\S]*position:\s*fixed/);
    assert.match(loginSection, /\.baruch-hashem-badge[\s\S]*inset-inline-start:/);
  });

  it('wrong-community action buttons share block sizing', () => {
    const scss = fs.readFileSync(path.join(ROOT, 'styles', 'admin.scss'), 'utf8');
    assert.match(scss, /\.btn-admin-block[\s\S]*min-height:\s*3rem/);
    assert.match(scss, /admin-wrong-community-page/);
  });

  it('static render script writes he and ru HTML', async () => {
    const script = path.join(ROOT, 'scripts', 'render-wrong-community-static.js');
    assert.ok(fs.existsSync(script));
    const text = fs.readFileSync(script, 'utf8');
    assert.match(text, /wrong-community\.handlebars/);
    assert.match(text, /\['he', 'ru'\]/);
  });
});
