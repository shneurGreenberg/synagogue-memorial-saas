import { useEffect } from 'react';
import { isBrowserOffline } from '../lib/network-backoff';
import { isBoardPreviewMode } from '../lib/board-preview-mode';
import {
  shouldSoftReload,
  softReloadDisabledByUrl,
  SOFT_RELOAD_CHECK_MS,
} from '../lib/board-soft-reload';

const OVERLAY_SELECTOR = '.slideshow-overlay, .presentation-image-overlay, .prayer-reading-overlay, .card-view';
const INTERACTION_EVENTS = ['click', 'keydown', 'touchstart', 'mousemove'];

/** 1.38.0 I85: periodic quiet reload of a long-running board (see lib/board-soft-reload.js). */
export function BoardSoftReload() {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (isBoardPreviewMode() || softReloadDisabledByUrl(window.location.search)) {
      return undefined;
    }

    const startedAt = Date.now();
    let lastInteraction = 0;
    let checking = false;
    const onInteraction = () => { lastInteraction = Date.now(); };
    INTERACTION_EVENTS.forEach((name) => document.addEventListener(name, onInteraction, { passive: true }));

    const timer = window.setInterval(() => {
      if (checking) return;
      const now = Date.now();
      const ok = shouldSoftReload({
        uptimeMs: now - startedAt,
        hour: new Date(now).getHours(),
        hidden: !!document.hidden,
        offline: isBrowserOffline(),
        sinceInteractionMs: lastInteraction ? now - lastInteraction : Infinity,
        overlayOpen: !!document.querySelector(OVERLAY_SELECTOR) || /\/card\//.test(window.location.pathname),
      });
      if (!ok) return;
      checking = true;
      // Make sure the server answers first, so a reload never leaves a blank screen.
      fetch(window.location.href, { method: 'HEAD', cache: 'no-store', credentials: 'same-origin' })
        .then((res) => {
          if (res && res.ok) {
            window.location.reload();
          }
        })
        .catch(() => {})
        .then(() => { checking = false; });
    }, SOFT_RELOAD_CHECK_MS);

    return () => {
      window.clearInterval(timer);
      INTERACTION_EVENTS.forEach((name) => document.removeEventListener(name, onInteraction));
    };
  }, []);

  return null;
}
