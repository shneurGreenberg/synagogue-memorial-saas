import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { assetUrl } from '../lib/asset-url';
import { useBoardData } from '../context/BoardDataContext';

const DEFAULT_INTERVAL_MS = 3 * 60 * 1000;
const DEFAULT_DURATION_MS = 10 * 1000;

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

function resolvePresentationOverlay(raw) {
  if (!raw || typeof raw !== 'object' || raw.enabled === false) {
    return null;
  }

  const image = typeof raw.image === 'string' ? raw.image.trim() : '';
  if (!image) {
    return null;
  }

  const intervalMs = Number(raw.intervalMs);
  const durationMs = Number(raw.durationMs);

  return {
    mode: 'single',
    images: [{ url: image, text: '' }],
    mainDurationMs: Number.isFinite(intervalMs) && intervalMs >= 15000 ? intervalMs : DEFAULT_INTERVAL_MS,
    slideIntervalMs: Number.isFinite(durationMs) && durationMs >= 2000 ? durationMs : DEFAULT_DURATION_MS,
  };
}

function resolveSlideshow(raw) {
  if (!raw || typeof raw !== 'object' || !raw.enabled) {
    return null;
  }

  const images = Array.isArray(raw.images)
    ? raw.images.filter((slide) => slide && (slide.url || slide.image))
    : [];
  if (!images.length) {
    return null;
  }

  const intervalSec = Number(raw.interval);
  const mainSec = Number(raw.mainDuration);

  return {
    mode: 'slideshow',
    images: images.map((slide) => ({
      url: slide.url || slide.image,
      text: slide.text || '',
    })),
    mainDurationMs: Number.isFinite(mainSec) && mainSec >= 5 ? mainSec * 1000 : 30 * 1000,
    slideIntervalMs: Number.isFinite(intervalSec) && intervalSec >= 2 ? intervalSec * 1000 : 10 * 1000,
  };
}

/**
 * Full-screen presentation / slideshow overlay on the live board.
 * Prefer classic slideshow config; fall back to presentationOverlay only if slideshow was never configured.
 */
export function PresentationImageOverlay() {
  const { data: board } = useBoardData();

  const config = useMemo(() => {
    const slideshowConfig = resolveSlideshow(board?.slideshow);
    if (slideshowConfig) {
      return slideshowConfig;
    }

    if (board?.slideshow && typeof board.slideshow === 'object') {
      return null;
    }

    return resolvePresentationOverlay(board?.presentationOverlay);
  }, [board?.slideshow, board?.presentationOverlay]);

  const [visible, setVisible] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    if (!config) {
      setVisible(false);
      setSlideIndex(0);
      return undefined;
    }

    let cancelled = false;
    let timer = null;
    let index = 0;

    const clear = () => {
      if (timer) {
        window.clearTimeout(timer);
        timer = null;
      }
    };

    const schedule = (fn, ms) => {
      clear();
      timer = window.setTimeout(fn, ms);
    };

    const showSlides = () => {
      if (cancelled || document.hidden) {
        schedule(showSlides, 1000);
        return;
      }

      index = 0;
      setSlideIndex(0);
      setVisible(true);

      const advance = () => {
        if (cancelled) return;
        const next = index + 1;
        if (next >= config.images.length) {
          setVisible(false);
          schedule(showSlides, config.mainDurationMs);
          return;
        }
        index = next;
        setSlideIndex(next);
        schedule(advance, config.slideIntervalMs);
      };

      schedule(advance, config.slideIntervalMs);
    };

    // First cycle: wait mainDuration on the board, then show slides.
    schedule(showSlides, config.mainDurationMs);

    return () => {
      cancelled = true;
      clear();
    };
  }, [config]);

  if (!config || !visible) {
    return null;
  }

  const slide = config.images[slideIndex] || config.images[0];
  if (!slide) {
    return null;
  }

  const src = resolveImageSrc(slide.url);
  const isSlideshow = config.mode === 'slideshow';

  return createPortal(
    <div
      className={isSlideshow ? 'slideshow-overlay' : 'presentation-image-overlay'}
      role="presentation"
      aria-hidden="true"
    >
      <img
        className={isSlideshow ? 'slideshow-image' : 'presentation-image-overlay__img'}
        src={src}
        alt=""
      />
      {isSlideshow && slide.text ? (
        <div className="slideshow-caption">{slide.text}</div>
      ) : null}
    </div>,
    document.body,
  );
}
