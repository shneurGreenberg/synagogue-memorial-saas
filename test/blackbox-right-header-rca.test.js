const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');

function loadLegacyBrowser(userAgent, hardwareConcurrency = 8) {
  const sandbox = {
    navigator: { userAgent, hardwareConcurrency },
    document: {
      createElement() {
        return { canPlayType: () => 'probably' };
      },
    },
    requestAnimationFrame() {},
  };
  sandbox.window = sandbox;
  const file = fs.readFileSync(
    path.join(root, 'client', 'src', 'lib', 'legacy-browser.js'),
    'utf8',
  );
  const script = file.replace(/\bexport\s+/g, '');
  vm.runInNewContext(script, sandbox, { filename: 'legacy-browser.js' });
  return sandbox;
}

/**
 * Minimal model of PresentationImageOverlay deferral when the tab is hidden.
 * Mirrors client/src/components/PresentationImageOverlay.jsx showSlides guard.
 */
function simulateOverlayHiddenDeferral({ hiddenAtStart, becomeVisibleBeforeShow }) {
  let visible = false;
  let deferrals = 0;

  const tryShow = (documentHidden) => {
    if (documentHidden) {
      deferrals += 1;
      return;
    }
    visible = true;
  };

  tryShow(hiddenAtStart);
  if (becomeVisibleBeforeShow && hiddenAtStart) {
    tryShow(false);
  }

  return { visible, deferrals };
}

describe('blackbox right-header RCA', () => {
  it('classifies Smart TV UA as low-power and uses static candles (GPU mitigation)', () => {
    const tv = loadLegacyBrowser('Mozilla/5.0 (Linux; Android 9; BRAVIA 4K) AppleWebKit Chrome/74', 4);
    assert.equal(tv.isLowPowerBoardBrowser(), true);
    assert.equal(tv.shouldReduceBoardCompositorLoad(), true);
    assert.equal(tv.resolveBoardCandleMode(), 'static');
  });

  it('uses full candles on desktop-class browsers', () => {
    const desktop = loadLegacyBrowser(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
      8,
    );
    assert.equal(desktop.isLowPowerBoardBrowser(), false);
    assert.equal(desktop.resolveBoardCandleMode(), 'full');
  });

  it('documents PresentationImageOverlay hidden deferral without auto-hide (pre-fix)', () => {
    const stuck = simulateOverlayHiddenDeferral({
      hiddenAtStart: true,
      becomeVisibleBeforeShow: false,
    });
    assert.equal(stuck.visible, false);
    assert.ok(stuck.deferrals >= 1);
  });

  it('flags compositor-heavy markers in board styles', () => {
    const candleScss = fs.readFileSync(path.join(root, 'styles', '_css-candle.scss'), 'utf8');
    const commonScss = fs.readFileSync(path.join(root, 'styles', 'common.scss'), 'utf8');
    const themeJsx = fs.readFileSync(
      path.join(root, 'client', 'src', 'components', 'ThemeStyles.jsx'),
      'utf8',
    );

    assert.match(candleScss, /will-change:\s*transform,\s*opacity/);
    assert.match(commonScss, /backdrop-filter:\s*blur\(8px\)/);
    assert.match(themeJsx, /bodyBackgroundAttachment/);
    assert.match(themeJsx, /shouldReduceBoardCompositorLoad/);
  });
});
