/**
 * 1.38.0 I85: one shared, cheap "flicker" driver for every candle flame on the board.
 *
 * Why: since 1.37.0 (I76) every candle ran its own infinite CSS keyframe animation with
 * `will-change: transform, opacity`. Each such flame is promoted to its own GPU compositor layer
 * that lives forever. On TV / weak Chromium, hours of that (plus the glass tiles and the 1-second
 * clock repaint next to them) exhaust GPU tile memory; the compositor then drops tiles and the
 * page background shows through over the top of the right column (clock + weekly parasha) until a
 * reload — the same "black box" failure that was analysed in docs/BLACKBOX_RCA.md.
 *
 * Now: a single timer (~10 fps) nudges each flame's inline transform / opacity a little. Plain 2D
 * transform/opacity changes are painted, not composited, so no permanent GPU layers are created,
 * and the tiny flame repaint is cheap. The timer stops when no flame is on screen and while the
 * page is hidden (TV standby, other tab).
 */

export const CANDLE_FLICKER_FRAME_MS = 100;

const flames = new Map();
let timer = 0;
let listening = false;
let reducedMotion = false;

function isHidden() {
  return typeof document !== 'undefined' && !!document.hidden;
}

/** Pure: the flame pose for time `t` (seconds) and a per-candle phase. Exported for tests. */
export function computeFlamePose(t, phase, reduced = false) {
  const p = t * ((2 * Math.PI) / 3.4) + phase;
  const sway = reduced ? 0 : Math.sin(p) * 2;
  const scale = 0.94 + 0.06 * (0.5 + 0.5 * Math.sin(p * 1.37 + 0.6));
  const opacity = 0.9 + 0.1 * (0.5 + 0.5 * Math.sin(p * 1.91 + 1.3));
  return {
    transform: `rotate(${sway.toFixed(2)}deg) scaleY(${scale.toFixed(3)})`,
    opacity: opacity.toFixed(3),
  };
}

function tick() {
  if (isHidden()) {
    return;
  }
  const t = Date.now() / 1000;
  flames.forEach((phase, el) => {
    if (!el || !el.isConnected) {
      flames.delete(el);
      return;
    }
    const pose = computeFlamePose(t, phase, reducedMotion);
    el.style.transform = pose.transform;
    el.style.opacity = pose.opacity;
  });
  if (!flames.size) {
    stop();
  }
}

function start() {
  if (timer || !flames.size || isHidden() || typeof window === 'undefined') {
    return;
  }
  timer = window.setInterval(tick, CANDLE_FLICKER_FRAME_MS);
}

function stop() {
  if (timer) {
    window.clearInterval(timer);
    timer = 0;
  }
}

function onVisibilityChange() {
  if (isHidden()) {
    stop();
  } else {
    start();
  }
}

function listenOnce() {
  if (listening || typeof document === 'undefined') {
    return;
  }
  listening = true;
  document.addEventListener('visibilitychange', onVisibilityChange);
  try {
    const mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq) {
      reducedMotion = !!mq.matches;
    }
  } catch (_) {
    reducedMotion = false;
  }
}

export function registerCandleFlame(el) {
  if (!el) {
    return () => {};
  }
  listenOnce();
  flames.set(el, Math.random() * Math.PI * 2);
  start();
  return () => {
    flames.delete(el);
    if (!flames.size) {
      stop();
    }
  };
}

/** For tests / diagnostics. */
export function candleFlickerState() {
  return { flames: flames.size, running: !!timer };
}
