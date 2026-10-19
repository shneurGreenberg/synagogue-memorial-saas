const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

const ROOT = path.join(__dirname, '..');

function compileYahrzeitUpcomingSnippet() {
  const source = fs.readFileSync(path.join(ROOT, 'views', 'admin', 'yahrzeit.handlebars'), 'utf8');
  const weekBlock = source.match(
    /<section class="admin-panel yahrzeit-upcoming-section">[\s\S]*?<\/section>/,
  );
  assert.ok(weekBlock, 'upcoming week section');
  return Handlebars.compile(weekBlock[0], { noEscape: true });
}

describe('admin yahrzeit upcoming badge (Z13)', () => {
  it('renders count badges with muted zero state', () => {
    const compile = compileYahrzeitUpcomingSnippet();
    const html = compile({
      upcomingWeek: [{ id: 1, name: 'A', hebrewDateLabel: 'א', gregorianDateLabel: '1.1.2020' }],
      t(key) {
        return key;
      },
    });

    assert.match(html, /yahrzeit-upcoming-count-badge/);
    assert.match(html, />1</);
    assert.doesNotMatch(html, /is-zero/);
    assert.match(html, /yahrzeit-upcoming-chevron/);
  });

  it('shows muted badge when count is zero', () => {
    const compile = compileYahrzeitUpcomingSnippet();
    const html = compile({
      upcomingWeek: [],
      t(key) {
        return key;
      },
    });

    assert.match(html, /yahrzeit-upcoming-count-badge is-zero/);
    assert.match(html, /yahrzeit-upcoming-count-badge[^>]*>0</);
  });
});
