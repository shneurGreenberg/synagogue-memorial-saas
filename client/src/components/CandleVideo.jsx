import React from 'react';

export function CandleVideo({ className = 'candle', active = true, animated = true }) {
  if (!active) {
    return null;
  }

  return (
    <div className={`css-candle${animated ? '' : ' css-candle-static'} ${className}`} aria-hidden="true">
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
