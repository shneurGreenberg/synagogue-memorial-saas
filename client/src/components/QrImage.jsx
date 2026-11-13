import React, { useCallback, useEffect, useRef } from 'react';
import { computeQrFit } from '../lib/qr-fit';

/**
 * 1.37.1 I83: barcode / QR image with rounded corners and no white square on every browser.
 * The <img> is sized in plain px to the visible picture (own aspect ratio, never distorted) and
 * gets a px border-radius on the image itself — no aspect-ratio, clip-path or overflow clipping,
 * so old TV WebViews round it too.
 */
export function QrImage({ src, alt }) {
  const ref = useRef(null);

  const fit = useCallback(() => {
    const img = ref.current;
    const frame = img && img.parentNode;
    if (!img || !frame) return;
    const result = computeQrFit({
      frameWidth: frame.clientWidth,
      frameHeight: frame.clientHeight,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
    });
    if (!result) return;
    img.style.width = `${result.width}px`;
    img.style.height = `${result.height}px`;
    img.style.borderRadius = `${result.radius}px`;
    if (img.classList) img.classList.add('is-fitted');
  }, []);

  useEffect(() => {
    const img = ref.current;
    if (img && img.complete) fit();
    window.addEventListener('resize', fit);
    let observer = null;
    const frame = img && img.parentNode;
    if (frame && typeof window.ResizeObserver === 'function') {
      observer = new window.ResizeObserver(() => fit());
      observer.observe(frame);
    }
    // Fonts / layout settle a moment after mount on slow TVs.
    const timer = window.setTimeout(fit, 1500);
    return () => {
      window.removeEventListener('resize', fit);
      if (observer) observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [fit, src]);

  return (
    <img
      ref={ref}
      className="memorial-submission-qr"
      src={src}
      alt={alt}
      decoding="async"
      onLoad={fit}
    />
  );
}
