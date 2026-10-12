import React, { useEffect, useState } from 'react';
import { formatClockTime } from '../lib/dates';

export function LiveClock({ timezone }) {
  const [time, setTime] = useState(() => formatClockTime(timezone));

  useEffect(() => {
    let timer = null;
    let aligner = null;
    const tick = () => setTime(formatClockTime(timezone));
    const start = () => {
      tick();
      if (timer) window.clearInterval(timer);
      if (aligner) window.clearTimeout(aligner);
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
    document.addEventListener('resume', onVisible);
    return () => {
      if (timer) window.clearInterval(timer);
      if (aligner) window.clearTimeout(aligner);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('pageshow', onVisible);
      document.removeEventListener('resume', onVisible);
    };
  }, [timezone]);

  return <span>{time}</span>;
}
