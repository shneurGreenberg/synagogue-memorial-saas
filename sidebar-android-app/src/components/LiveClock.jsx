import React, { useEffect, useState } from 'react';
import { formatClockTime } from '../lib/dates';

export function LiveClock({ timezone }) {
  const [time, setTime] = useState(() => formatClockTime(timezone));

  useEffect(() => {
    setTime(formatClockTime(timezone));
    const timer = window.setInterval(() => setTime(formatClockTime(timezone)), 1000);
    return () => window.clearInterval(timer);
  }, [timezone]);

  return <span>{time}</span>;
}
