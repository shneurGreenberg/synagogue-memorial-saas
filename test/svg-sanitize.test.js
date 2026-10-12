const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeSvg } = require('../lib/svg-sanitize');

describe('sanitizeSvg', () => {
  it('keeps a minimal valid svg', () => {
    const input = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>';
    const out = sanitizeSvg(input);
    assert.ok(out && out.includes('<svg'));
    assert.ok(out.includes('<rect'));
  });

  it('strips script blocks and event handlers', () => {
    const input = '<svg><script>alert(1)</script><rect width="1" onclick="evil()"/></svg>';
    const out = sanitizeSvg(input);
    assert.ok(out);
    assert.equal(/<script/i.test(out), false);
    assert.equal(/onclick/i.test(out), false);
  });

  it('rejects foreignObject and javascript urls', () => {
    assert.equal(sanitizeSvg('<svg><foreignObject><body xmlns="http://www.w3.org/1999/xhtml">x</body></foreignObject></svg>'), null);
    const withJs = '<svg><a xlink:href="javascript:alert(1)"/></svg>';
    const out = sanitizeSvg(withJs);
    assert.ok(!out || !/javascript:/i.test(out));
  });

  it('rejects external href references', () => {
    const input = '<svg><image href="https://evil.example/x.png"/></svg>';
    const out = sanitizeSvg(input);
    assert.ok(!out || !/https:\/\//i.test(out));
  });
});
