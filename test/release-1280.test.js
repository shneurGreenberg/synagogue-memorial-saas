const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');
const { jsonForScript } = require('../lib/json-script');
const { isValidAdminUsername, serializeAdminUsers } = require('../lib/admin-users');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

describe('release 1.28 F7 security', () => {
  it('H1: jsonCompact output cannot break out of an inline <script>', () => {
    const out = jsonForScript({ t: '</script><script>alert(1)</script>&\u2028\u2029' });
    assert.doesNotMatch(out, /</);
    assert.doesNotMatch(out, /\u2028|\u2029/);
    assert.deepEqual(JSON.parse(out), { t: '</script><script>alert(1)</script>&\u2028\u2029' });
    assert.equal(jsonForScript(undefined), 'null');
    assert.match(read('app.js'), /jsonCompact: value => jsonForScript\(value\)/);
  });

  it('H2: default master password is logged loudly in production', () => {
    assert.match(read('lib/http-security.js'), /console\.error\(\s*'!!! SECURITY ERROR/);
  });

  it('M1: admin users list requires a full admin', () => {
    assert.match(read('routes/admin.js'), /router\.get\('\/:slug\/users', requireAdmin, requireFullAdmin,/);
  });

  it('M4/L2: 5xx responses never echo raw err.message', () => {
    ['routes/public-submission.js', 'routes/admin.js', 'routes/master.js'].forEach((file) => {
      const src = read(file);
      assert.doesNotMatch(src, /status\(50\d\)\.(send|json)\([^)]*err\.message/, file);
      assert.match(src, /publicErrorMessage/, file);
    });
  });
});

describe('release 1.28 F4 admin users', () => {
  it('login names are a single word', () => {
    assert.equal(isValidAdminUsername('yossi'), true);
    assert.equal(isValidAdminUsername('yossi cohen'), false);
    assert.equal(isValidAdminUsername('a\tb'), false);
    assert.equal(isValidAdminUsername('a/b'), false);
    assert.equal(isValidAdminUsername('  '), false);
  });

  it('serialized users expose only whether a personal code exists, never the hash', () => {
    const [u] = serializeAdminUsers([{ _id: 'x', username: 'a', passwordHash: '$2a$10$abc' }]);
    assert.equal(u.hasOwnPassword, true);
    assert.equal(Object.values(u).includes('$2a$10$abc'), false);
  });

  it('routes validate username and hash the personal code', () => {
    const src = read('routes/admin.js');
    assert.match(src, /error=invalid_username/);
    assert.match(src, /adminUsers\.\$\.passwordHash/);
    assert.match(src, /namedUser\.passwordHash/);
    const form = read('views/partials/user-form-fields.handlebars');
    assert.match(form, /name="password"/);
    assert.match(form, /data-single-word="1"/);
  });
});

describe('release 1.28 F5/F6 preview + saved-view thumbnails', () => {
  it('F5: admin settings projection loads the board subtitle and title', () => {
    const src = read('lib/admin-synagogue-load.js');
    assert.match(src, /boardSubtitle/);
    assert.match(src, /boardTitleText/);
  });

  it('F6: thumbnails are a pixel capture of the preview iframe (modern-screenshot)', () => {
    const src = read('public/js/admin-settings-panel.js');
    assert.match(src, /modernScreenshot/);
    assert.match(src, /domToCanvas\(doc\.documentElement/);
    assert.ok(fs.existsSync(path.join(root, 'public/js/vendor/modern-screenshot.min.js')));
  });
});

describe('release 1.28 F1-F3/F8 public pages', () => {
  it('add-name: dial code display, pill slider, ב״ה above the card', () => {
    const tpl = read('views/public/add-name.handlebars');
    assert.match(tpl, /public-phone-dial-display/);
    assert.match(tpl, /public-pill-slider\.js/);
    const scss = read('styles/public-submission.scss');
    assert.match(scss, /\.public-submission-page > \.baruch-hashem-badge/);
    assert.match(scss, /\.public-pill-slider/);
    assert.ok(fs.existsSync(path.join(root, 'public/js/public-pill-slider.js')));
  });

  it('onboarding language picker is centered with fixed LTR geometry', () => {
    const scss = read('styles/onboarding.scss');
    assert.match(scss, /grid-template-columns: 1fr auto 1fr/);
    assert.match(scss, /\.onboarding-lang-pills \{\s*direction: ltr/);
  });
});
