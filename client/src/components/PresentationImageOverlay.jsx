import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { assetUrl } from '../lib/asset-url';
import { useBoardData } from '../context/BoardDataContext';

const DEFAULT_INTERVAL_MS = 3 * 60 * 1000;
const DEFAULT_DURATION_MS = 10 * 1000;

function resolveOverlayConfig(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  if (raw.enabled === false) {
    return null;
  }

  const image = typeof raw.image === 'string' ? raw.image.trim() : '';
  if (!image) {
    return null;
  }

  const intervalMs = Number(raw.intervalMs);
  const durationMs = Number(raw.durationMs);

  return {
    image,
    intervalMs: Number.isFinite(intervalMs) && intervalMs >= 15000 ? intervalMs : DEFAULT_INTERVAL_MS,
    durationMs: Number.isFinite(durationMs) && durationMs >= 2000 ? durationMs : DEFAULT_DURATION_MS,
  };
}

function resolveImageSrc(image) {
  if (!image) return '';
  if (/^https?:\/\//i.test(image) || image.startsWith('data:')) {
    return image;
  }
  if (image.startsWith('/')) {
    return image;
  }
  if (image.startsWith('images/') || image.startsWith('photos/')) {
    return assetUrl(image);
  }
  return assetUrl(`images/${image}`);
}

/**
 * Full-screen presentation image on the live board.
 * Shows for `durationMs` every `intervalMs` when community has presentationOverlay configured.
 */
export function PresentationImageOverlay() {
  const { data: board } = useBoardData();
  const config = resolveOverlayConfig(board?.presentationOverlay);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!config) {
      setVisible(false);
      return undefined;
    }

    let hideTimer = null;
    let cancelled = false;

    const show = () => {
      if (cancelled || document.hidden) {
        return;
      }
      setVisible(true);
      if (hideTimer) {
        window.clearTimeout(hideTimer);
      }
      hideTimer = window.setTimeout(() => {
        if (!cancelled) {
          setVisible(false);
        }
      }, config.durationMs);
    };

    // First show after one full interval (don't interrupt initial board load).
    const intervalId = window.setInterval(show, config.intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      if (hideTimer) {
        window.clearTimeout(hideTimer);
      }
    };
  }, [config?.image, config?.intervalMs, config?.durationMs]);

  if (!config || !visible) {
    return null;
  }

  const src = resolveImageSrc(config.image);

  return createPortal(
    <div className="presentation-image-overlay" role="presentation" aria-hidden="true">
      <img className="presentation-image-overlay__img" src={src} alt="" />
    </div>,
    document.body,
  );
}
