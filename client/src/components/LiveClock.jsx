import React, { useEffect, useState } from 'react';
import { resolveBoardTimezone } from '../lib/timezone';

function formatTime(timeZone) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(new Date());
}

export function LiveClock({ timezone = 'Asia/Novosibirsk' }) {
  const safeTimezone = resolveBoardTimezone({ location: { timezone } });
  const [time, setTime] = useState(() => formatTime(safeTimezone));

  useEffect(() => {
    let timer = null;
    let aligner = null;
    const tick = () => setTime(formatTime(safeTimezone));
    const start = () => {
      tick();
      if (timer) window.clearInterval(timer);
      if (aligner) window.clearTimeout(aligner);
      // Align to the next full second so the minute flips immediately.
      aligner = window.setTimeout(() => {
        tick();
        timer = window.setInterval(tick, 1000);
      }, 1000 - (Date.now() % 1000) + 5);
    };
    const onVisible = () => {
      if (document.visibilityState !== 'hidden') start();
    };
    start();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('pageshow', onVisible);

    return () => {
      if (timer) window.clearInterval(timer);
      if (aligner) window.clearTimeout(aligner);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('pageshow', onVisible);
    };
  }, [safeTimezone]);

  return <span>{time}</span>;
}
