const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildHealthPayload } = require('../lib/health-payload');
const { getHayomYomDisplayText } = require('../lib/hayom-yom-display-text');

const SCSS_PATH = path.join(__dirname, '..', 'styles', 'public-submission.scss');
const COMMON_SCSS = path.join(__dirname, '..', 'styles', 'common.scss');
const DECEASED_BLOCK = path.join(
  __dirname,
  '..',
  'views',
  'partials',
  'public-add-name-deceased-block.handlebars',
);

describe('release 1.26 add-name page polish', () => {
  it('uses pill sunset toggle matching gender pills and full width', () => {
    const html = fs.readFileSync(DECEASED_BLOCK, 'utf8');
    assert.match(html, /public-sunset-pills/);
    assert.match(html, /public-gender-pills public-sunset-pills/);

    const scss = fs.readFileSync(SCSS_PATH, 'utf8');
    const pills = scss.match(/\.public-gender-pills\s*\{[^}]+\}/);
    assert.ok(pills, '.public-gender-pills rule missing');
    assert.match(pills[0], /width:\s*100%/);
  });

  it('places gender field immediately after the first-name row', () => {
    const html = fs.readFileSync(DECEASED_BLOCK, 'utf8');
    const firstNameIdx = html.indexOf('deceased_first_name_label');
    const genderIdx = html.indexOf('public-gender-field');
    const fatherIdx = html.indexOf('father_name_label');
    assert.ok(firstNameIdx > -1 && genderIdx > firstNameIdx);
    assert.ok(fatherIdx > genderIdx);
  });

  it('keeps country dial and national number on one phone row', () => {
    const addName = fs.readFileSync(
      path.join(__dirname, '..', 'views', 'public', 'add-name.handlebars'),
      'utf8',
    );
    assert.match(addName, /public-phone-row/);
    assert.match(addName, /public-phone-dial/);
    assert.match(addName, /public-phone-national/);
  });
});

describe('release 1.26 static ב״ה badge', () => {
  it('does not use fixed positioning on the board badge', () => {
    const scss = fs.readFileSync(COMMON_SCSS, 'utf8');
    const block = scss.match(/\.baruch-hashem-badge\s*\{[^}]+\}/);
    assert.ok(block, '.baruch-hashem-badge rule missing');
    assert.match(block[0], /position:\s*static/);
    assert.doesNotMatch(block[0], /position:\s*fixed/);
  });
});

describe('release 1.26 Hayom Yom placeholder fallback', () => {
  it('falls back to original text when translation is a placeholder', () => {
    const original = 'Когда вы распростираете ладони';
    assert.equal(getHayomYomDisplayText('hard to translate', original), original);
  });
});

describe('release 1.26 public health endpoint', () => {
  it('returns JSON with node runtime and app version only', () => {
    const payload = buildHealthPayload();
    assert.equal(payload.ok, true);
    assert.match(payload.node, /^v\d+\.\d+\.\d+/);
    assert.match(payload.version, /^\d+\.\d+\.\d+$/);
    assert.deepEqual(Object.keys(payload).sort(), ['node', 'ok', 'version']);
  });
});

describe('release 1.26 changelog version', () => {
  it('includes 1.26.0 in CHANGELOG.json', () => {
    const changelog = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.json'), 'utf8'),
    );
    assert.ok(changelog.some((entry) => entry.version === '1.26.0'));
  });
});
