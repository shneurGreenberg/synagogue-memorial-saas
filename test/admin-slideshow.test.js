const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  parseSlideshowSettingsBody,
  shouldShowSlideshowRotateFields,
  slideshowRotateFieldsInitiallyHidden,
} = require('../lib/slideshow-admin-settings');

const ROOT = path.join(__dirname, '..');

describe('slideshow-admin-settings', () => {
  it('parses three-state slideshowMode values', () => {
    assert.deepEqual(parseSlideshowSettingsBody({ slideshowMode: 'off' }), {
      isEnabled: false,
      mode: 'rotate',
      modeValue: 'off',
    });
    assert.deepEqual(parseSlideshowSettingsBody({ slideshowMode: 'rotate' }), {
      isEnabled: true,
      mode: 'rotate',
      modeValue: 'rotate',
    });
    assert.deepEqual(parseSlideshowSettingsBody({ slideshowMode: 'showNow' }), {
      isEnabled: true,
      mode: 'showNow',
      modeValue: 'showNow',
    });
  });

  it('shows rotate timing fields only in rotate mode', () => {
    assert.equal(shouldShowSlideshowRotateFields('rotate'), true);
    assert.equal(shouldShowSlideshowRotateFields('showNow'), false);
    assert.equal(shouldShowSlideshowRotateFields('off'), false);
  });

  it('hides rotate fields initially when slideshow is off or show-now', () => {
    assert.equal(slideshowRotateFieldsInitiallyHidden({ enabled: false }), true);
    assert.equal(slideshowRotateFieldsInitiallyHidden({ enabled: true, isShowNowMode: true }), true);
    assert.equal(slideshowRotateFieldsInitiallyHidden({ enabled: true, isShowNowMode: false }), false);
  });
});

describe('admin events slideshow template', () => {
  it('wires edit image control to hidden file input', () => {
    const source = fs.readFileSync(
      path.join(ROOT, 'views', 'admin', 'events.handlebars'),
      'utf8',
    );
    assert.match(source, /id="slideshowEditImageBtn"/);
    assert.match(source, /id="slideshowImageInput"/);
    assert.match(source, /slideshow-panel-layout/);
  });
});
