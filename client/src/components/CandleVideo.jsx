import React, { useEffect, useRef } from 'react';
import { registerCandleFlame } from '../lib/candle-flicker';

/**
 * Modes: 'full' (glow + flicker), 'lite' (no glow, flicker), 'static' (no motion),
 * 'css' (the pre-1.38 per-candle CSS keyframe animation, only via `?candle=css`).
 * 1.38.0 I85: 'full' and 'lite' flicker through one shared JS driver (no GPU layer per candle).
 */
export function CandleVideo({ className = 'candle', active = true, mode = 'full' }) {
  const flameRef = useRef(null);
  const driven = active && (mode === 'full' || mode === 'lite');

  useEffect(() => {
    if (!driven) {
      return undefined;
    }
    return registerCandleFlame(flameRef.current);
  }, [driven]);

  if (!active) {
    return null;
  }

  const modeClass = mode === 'static'
    ? ' css-candle-static'
    : mode === 'lite'
      ? ' css-candle-lite'
      : mode === 'css'
        ? ' css-candle-css'
        : '';

  return (
    <div className={`css-candle${modeClass} ${className}`} aria-hidden="true">
      <div className="css-candle-top">
        <div className="css-candle-glow" />
        <div className="css-candle-flame" ref={flameRef} />
        <div className="css-candle-blue-part" />
        <div className="css-candle-thread" />
      </div>
      <div className="css-candle-wax" />
      <div className="css-candle-bottom" />
    </div>
  );
}
