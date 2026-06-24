import { assetUrl } from './asset-url';

const subscribers = new Map();
let sharedVideo = null;
let rafId = null;
let nextId = 0;
let reducedMotion = false;
let visibilityListenerAttached = false;
let renderMode = 'unknown'; // 'video' | 'fallback' | 'unknown'
let lastDrawTime = 0;
let statusListeners = new Set();
let posterImage = null;
let posterReady = false;

import { isLowPowerBoardBrowser } from './legacy-browser';

const NORMAL_FRAME_INTERVAL_MS = 1000 / 12;
const LOW_POWER_FRAME_INTERVAL_MS = 1000 / 8;
const VIDEO_READY_TIMEOUT_MS = 15000;

function notifyStatusListeners() {
  statusListeners.forEach((listener) => {
    listener(renderMode);
  });
}

function setRenderMode(nextMode) {
  if (renderMode === nextMode) {
    return;
  }

  renderMode = nextMode;
  notifyStatusListeners();
}

export function getCandleRenderMode() {
  return renderMode;
}

export function subscribeCandleStatus(listener) {
  statusListeners.add(listener);
  listener(renderMode);

  return () => {
    statusListeners.delete(listener);
  };
}

function canPlayH264Reliably() {
  if (typeof document === 'undefined') {
    return false;
  }

  const probe = document.createElement('video');
  const support = probe.canPlayType('video/mp4; codecs="avc1.42E01E"');
  return support === 'probably' || support === 'maybe';
}

function getFrameIntervalMs() {
  return isLowPowerBoardBrowser() ? LOW_POWER_FRAME_INTERVAL_MS : NORMAL_FRAME_INTERVAL_MS;
}

function prefersCandleFallback() {
  if (typeof document === 'undefined') {
    return true;
  }

  if (!canPlayH264Reliably()) {
    return true;
  }

  if (typeof requestAnimationFrame !== 'function') {
    return true;
  }

  const canvas = document.createElement('canvas');
  if (!canvas.getContext) {
    return true;
  }

  return false;
}

function attachVisibilityListener() {
  if (visibilityListenerAttached || typeof document === 'undefined') {
    return;
  }

  visibilityListenerAttached = true;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopLoop();
      return;
    }

    if (hasActiveVisibleSubscriber()) {
      ensureLoop();
    }
  });
}

function prefersReducedMotion() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function onVideoFailed() {
  setRenderMode('fallback');
  stopLoop();
}

function loadPosterImage() {
  if (posterImage || typeof Image === 'undefined') {
    return posterImage;
  }

  posterImage = new Image();
  posterImage.src = candlePosterUrl();
  posterImage.addEventListener('load', () => {
    posterReady = true;
    if (renderMode === 'video') {
      subscribers.forEach((sub) => {
        if (sub.active && sub.visible && sub.canvas.isConnected) {
          drawFrame(sub);
        }
      });
    }
  });

  return posterImage;
}

function attachVideoListeners(video) {
  let readyTimer = null;

  const clearReadyTimer = () => {
    if (readyTimer) {
      window.clearTimeout(readyTimer);
      readyTimer = null;
    }
  };

  const markReady = () => {
    if (video.readyState >= 2) {
      clearReadyTimer();
      setRenderMode('video');
    }
  };

  video.addEventListener('loadeddata', markReady);
  video.addEventListener('canplay', markReady);
  video.addEventListener('error', () => {
    clearReadyTimer();
    onVideoFailed();
  });

  readyTimer = window.setTimeout(() => {
    if (video.readyState < 2) {
      onVideoFailed();
    }
  }, VIDEO_READY_TIMEOUT_MS);
}

function getSharedVideo() {
  if (!sharedVideo) {
    if (prefersCandleFallback()) {
      setRenderMode('fallback');
      return null;
    }

    sharedVideo = document.createElement('video');
    sharedVideo.src = assetUrl('images/candle.mp4');
    sharedVideo.muted = true;
    sharedVideo.loop = true;
    sharedVideo.playsInline = true;
    sharedVideo.preload = 'auto';
    sharedVideo.setAttribute('playsinline', '');
    sharedVideo.setAttribute('webkit-playsinline', '');
    attachVideoListeners(sharedVideo);
    loadPosterImage();
  }

  return sharedVideo;
}

function hasActiveVisibleSubscriber() {
  for (const sub of subscribers.values()) {
    if (sub.active && sub.visible) {
      return true;
    }
  }

  return false;
}

function getCanvasDpr() {
  if (isLowPowerBoardBrowser()) {
    return 1;
  }

  const dpr = window.devicePixelRatio || 1;
  const cores = navigator.hardwareConcurrency || 4;

  if (cores <= 2 || dpr > 2) {
    return 1;
  }

  return Math.min(dpr, 1.25);
}

function syncCanvasSize(canvas) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) {
    return false;
  }

  const dpr = getCanvasDpr();
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  return true;
}

function drawPosterFrame(sub) {
  const poster = loadPosterImage();
  if (!posterReady || !poster || !poster.complete) {
    return false;
  }

  if (!syncCanvasSize(sub.canvas)) {
    return false;
  }

  sub.ctx.clearRect(0, 0, sub.canvas.width, sub.canvas.height);
  sub.ctx.drawImage(poster, 0, 0, sub.canvas.width, sub.canvas.height);
  return true;
}

function drawFrame(sub) {
  const video = sharedVideo;
  if (video && video.readyState >= 2 && !video.paused && !video.ended) {
    if (!syncCanvasSize(sub.canvas)) {
      return;
    }

    try {
      sub.ctx.clearRect(0, 0, sub.canvas.width, sub.canvas.height);
      sub.ctx.drawImage(video, 0, 0, sub.canvas.width, sub.canvas.height);
      return;
    } catch {
      /* fall through to poster */
    }
  }

  drawPosterFrame(sub);
}

function stopLoop() {
  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  if (sharedVideo) {
    sharedVideo.pause();
  }
}

function tick(now) {
  if (!hasActiveVisibleSubscriber()) {
    stopLoop();
    return;
  }

  if (renderMode === 'fallback') {
    stopLoop();
    return;
  }

  const frameTime = now || Date.now();
  const frameIntervalMs = getFrameIntervalMs();
  const elapsed = frameTime - lastDrawTime;
  if (elapsed >= frameIntervalMs) {
    lastDrawTime = frameTime - (elapsed % frameIntervalMs);

    subscribers.forEach((sub) => {
      if (!sub.active || !sub.visible || !sub.canvas.isConnected) {
        return;
      }

      drawFrame(sub);
    });
  }

  rafId = requestAnimationFrame(tick);
}

function ensureLoop() {
  if (renderMode === 'fallback') {
    return;
  }

  if (reducedMotion) {
    const video = getSharedVideo();
    if (!video) {
      return;
    }

    subscribers.forEach((sub) => {
      if (sub.active && sub.visible && sub.canvas.isConnected) {
        drawFrame(sub);
      }
    });
    return;
  }

  if (rafId != null) {
    return;
  }

  const video = getSharedVideo();
  if (!video) {
    return;
  }

  const playPromise = video.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {
      if (!drawPosterFrameForAll()) {
        onVideoFailed();
      }
    });
  }

  lastDrawTime = 0;
  rafId = requestAnimationFrame(tick);
}

function drawPosterFrameForAll() {
  let drewAny = false;

  subscribers.forEach((sub) => {
    if (!sub.active || !sub.visible || !sub.canvas.isConnected) {
      return;
    }

    if (drawPosterFrame(sub)) {
      drewAny = true;
    }
  });

  return drewAny;
}

function observeVisibility(sub, canvas) {
  if (typeof IntersectionObserver === 'undefined') {
    sub.visible = true;
    updateSubscriberState(sub);
    return;
  }

  sub.observer = new IntersectionObserver((entries) => {
    sub.visible = Boolean(entries[0]?.isIntersecting);
    updateSubscriberState(sub);
  }, { threshold: 0.01 });

  sub.observer.observe(canvas);
}

function updateSubscriberState(sub) {
  if (sub.active && sub.visible) {
    ensureLoop();
    return;
  }

  if (!hasActiveVisibleSubscriber()) {
    stopLoop();
  }
}

export function subscribeCandleCanvas(canvas, { active = true } = {}) {
  nextId += 1;
  const id = nextId;
  const ctx = canvas.getContext('2d', { alpha: true });

  if (!ctx) {
    setRenderMode('fallback');
    return {
      setActive() {},
      setVisible() {},
      unsubscribe() {},
    };
  }

  const sub = {
    canvas,
    ctx,
    active,
    visible: false,
    observer: null,
    resizeObserver: null,
  };

  observeVisibility(sub, canvas);

  if (typeof ResizeObserver !== 'undefined') {
    sub.resizeObserver = new ResizeObserver(() => {
      if (sub.active && sub.visible && renderMode !== 'fallback') {
        drawFrame(sub);
      }
    });
    sub.resizeObserver.observe(canvas);
  }

  subscribers.set(id, sub);
  reducedMotion = prefersReducedMotion();
  attachVisibilityListener();

  if (prefersCandleFallback()) {
    setRenderMode('fallback');
  } else if (active) {
    ensureLoop();
  }

  return {
    setActive(nextActive) {
      sub.active = nextActive;
      updateSubscriberState(sub);
    },
    setVisible(nextVisible) {
      sub.visible = nextVisible;
      updateSubscriberState(sub);
    },
    unsubscribe() {
      sub.observer?.disconnect();
      sub.resizeObserver?.disconnect();
      subscribers.delete(id);

      if (!hasActiveVisibleSubscriber()) {
        stopLoop();
      }
    },
  };
}

export function candlePosterUrl() {
  return assetUrl('images/candle-poster.png');
}
