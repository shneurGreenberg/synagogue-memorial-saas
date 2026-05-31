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
    setTime(formatTime(safeTimezone));
    const timer = window.setInterval(() => {
      setTime(formatTime(safeTimezone));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [safeTimezone]);

  return <span>{time}</span>;
}
