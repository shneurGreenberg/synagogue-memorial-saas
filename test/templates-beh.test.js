const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function readViewsGershayim() {
  const files = [
    'views/partials/beh-badge.handlebars',
    'views/layouts/admin.handlebars',
  ];
  return files.map((rel) => ({
    rel,
    text: fs.readFileSync(path.join(ROOT, rel), 'utf8'),
  }));
}

describe('regression: ב״ה with gershayim (1.15)', () => {
  it('login page includes beh-badge partial', () => {
    const login = fs.readFileSync(path.join(ROOT, 'views/admin/login.handlebars'), 'utf8');
    assert.match(login, /\{\{>\s*beh-badge\s*\}\}/);
  });

  it('uses ב״ה not bare בה in shared templates', () => {
    for (const { rel, text } of readViewsGershayim()) {
      assert.match(text, /ב״ה/, `${rel} should contain ב״ה`);
    }
  });
});
