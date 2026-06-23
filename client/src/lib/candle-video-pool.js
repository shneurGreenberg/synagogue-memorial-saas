import { assetUrl } from './asset-url';

const subscribers = new Map();
let sharedVideo = null;
let rafId = null;
let nextId = 0;
let reducedMotion = false;
let visibilityListenerAttached = false;

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

function getSharedVideo() {
  if (!sharedVideo) {
    sharedVideo = document.createElement('video');
    sharedVideo.src = assetUrl('images/candle.mp4');
    sharedVideo.muted = true;
    sharedVideo.loop = true;
    sharedVideo.playsInline = true;
    sharedVideo.preload = 'auto';
    sharedVideo.setAttribute('playsinline', '');
    sharedVideo.setAttribute('webkit-playsinline', '');
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

function syncCanvasSize(canvas) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) {
    return false;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  return true;
}

function drawFrame(sub) {
  const video = sharedVideo;
  if (!video || video.readyState < 2) {
    return;
  }

  if (!syncCanvasSize(sub.canvas)) {
    return;
  }

  sub.ctx.clearRect(0, 0, sub.canvas.width, sub.canvas.height);
  sub.ctx.drawImage(video, 0, 0, sub.canvas.width, sub.canvas.height);
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

function tick() {
  if (!hasActiveVisibleSubscriber()) {
    stopLoop();
    return;
  }

  subscribers.forEach((sub) => {
    if (!sub.active || !sub.visible || !sub.canvas.isConnected) {
      return;
    }

    drawFrame(sub);
  });

  rafId = requestAnimationFrame(tick);
}

function ensureLoop() {
  if (reducedMotion) {
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
  const playPromise = video.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {});
  }

  rafId = requestAnimationFrame(tick);
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

  sub.observer = new IntersectionObserver((entries) => {
    sub.visible = Boolean(entries[0]?.isIntersecting);
    updateSubscriberState(sub);
  }, { threshold: 0.01 });

  sub.observer.observe(canvas);

  if (typeof ResizeObserver !== 'undefined') {
    sub.resizeObserver = new ResizeObserver(() => {
      if (sub.active && sub.visible) {
        drawFrame(sub);
      }
    });
    sub.resizeObserver.observe(canvas);
  }

  subscribers.set(id, sub);
  reducedMotion = prefersReducedMotion();
  attachVisibilityListener();

  if (active) {
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
