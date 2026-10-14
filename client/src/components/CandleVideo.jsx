import React from 'react';

export function CandleVideo({ className = 'candle', active = true, mode = 'full' }) {
  if (!active) {
    return null;
  }

  const modeClass = mode === 'static'
    ? ' css-candle-static'
    : mode === 'lite'
      ? ' css-candle-lite'
      : '';

  return (
    <div className={`css-candle${modeClass} ${className}`} aria-hidden="true">
      <div className="css-candle-top">
        <div className="css-candle-glow" />
        <div className="css-candle-flame" />
        <div className="css-candle-blue-part" />
        <div className="css-candle-thread" />
      </div>
      <div className="css-candle-wax" />
      <div className="css-candle-bottom" />
    </div>
  );
}
