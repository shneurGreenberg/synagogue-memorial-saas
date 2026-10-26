const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('board ב״ה in right column flow', () => {
  it('renders badge in the right column above its frame (1.29 H4), not as board overlay', () => {
    const home = fs.readFileSync(path.join(ROOT, 'client', 'src', 'pages', 'HomePage.jsx'), 'utf8');
    const layout = fs.readFileSync(path.join(ROOT, 'client', 'src', 'BoardLayout.jsx'), 'utf8');

    assert.match(home, /<aside className="right side-panel">\s*<BaruchHashemBadge placement="outside" \/>/);
    assert.doesNotMatch(layout, /BaruchHashemBadge/);
  });

  it('styles column badge as in-flow (not fixed)', () => {
    const scss = fs.readFileSync(path.join(ROOT, 'styles', 'home.scss'), 'utf8');
    assert.match(scss, /\.baruch-hashem-badge--column[\s\S]*position:\s*static/);
  });
});
