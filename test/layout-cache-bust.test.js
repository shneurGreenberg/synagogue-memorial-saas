const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const LAYOUTS = [
  'views/layouts/admin.handlebars',
  'views/layouts/landing.handlebars',
  'views/layouts/master.handlebars',
  'views/board.handlebars',
];

describe('regression: CSS/JS cache bust ?v=', () => {
  it('layouts reference version query on static assets', () => {
    for (const rel of LAYOUTS) {
      const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      assert.match(text, /\?v=\{\{/, `${rel} should use ?v= version param`);
    }
  });

  it('board bundle uses boardVersion for memorial assets', () => {
    const text = fs.readFileSync(path.join(ROOT, 'views/board.handlebars'), 'utf8');
    assert.match(text, /memorial\.css\?v=\{\{boardVersion\}\}/);
    assert.match(text, /memorial\.js\?v=\{\{boardVersion\}\}/);
  });
});
