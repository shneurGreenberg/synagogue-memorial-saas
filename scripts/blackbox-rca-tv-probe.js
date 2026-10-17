/**
 * Paste into Chrome DevTools on the TV (remote debugging) when the black box appears.
 * Adjust selectors if the clock block is missing from the DOM (fully obscured).
 */
(function blackboxProbe() {
  const clock = document.querySelector('.board-clock-block');
  if (!clock) {
    console.warn('blackbox-probe: .board-clock-block not found');
    return;
  }

  const r = clock.getBoundingClientRect();
  const points = [
    ['top-right', r.right - 8, r.top + 8],
    ['center', r.left + r.width / 2, r.top + r.height / 2],
  ];

  const hits = points.map(([label, x, y]) => {
    const el = document.elementFromPoint(x, y);
    return {
      label,
      x,
      y,
      tag: el?.tagName,
      className: el?.className,
      id: el?.id,
    };
  });

  const fixed = [...document.querySelectorAll('*')]
    .filter((el) => getComputedStyle(el).position === 'fixed')
    .map((el) => ({
      className: el.className,
      zIndex: getComputedStyle(el).zIndex,
      rect: el.getBoundingClientRect(),
    }));

  const overlay = document.querySelector('.slideshow-overlay, .presentation-image-overlay');

  console.log('blackbox-probe hits', hits);
  console.log('blackbox-probe fixed layers', fixed);
  console.log('blackbox-probe fullscreen overlay', overlay ? overlay.className : null);
  console.log('blackbox-probe candle mode markers', {
    liteCandles: document.querySelectorAll('.css-candle-lite').length,
    staticCandles: document.querySelectorAll('.css-candle-static').length,
    goldenPanels: document.querySelectorAll('.golden-panel').length,
  });

  return { hits, fixed, overlay: overlay?.className || null };
})();
