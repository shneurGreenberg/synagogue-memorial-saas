import React, { useEffect, useState } from 'react';

function formatTime(timeZone) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(new Date());
}

export function LiveClock({ timezone = 'Asia/Novosibirsk' }) {
  const [time, setTime] = useState(() => formatTime(timezone));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTime(formatTime(timezone));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [timezone]);

  return <span>{time}</span>;
}
