import { useEffect } from 'react';
import { getBoardData } from '../lib/board-data';

export function IdleReload() {
  useEffect(() => {
    const data = getBoardData();
    const reloadAfter = data.reloadTimeout;

    if (!reloadAfter) {
      return undefined;
    }

    let idleMs = 0;
    const tickMs = 60000;

    const resetIdle = () => {
      idleMs = 0;
    };

    ['click', 'keydown', 'touchstart', 'mousemove'].forEach((eventName) => {
      document.addEventListener(eventName, resetIdle, { passive: true });
    });

    const timer = window.setInterval(() => {
      if (document.hidden) {
        return;
      }

      idleMs += tickMs;

      if (idleMs >= reloadAfter) {
        window.location.reload();
      }
    }, tickMs);

    return () => {
      window.clearInterval(timer);
      ['click', 'keydown', 'touchstart', 'mousemove'].forEach((eventName) => {
        document.removeEventListener(eventName, resetIdle);
      });
    };
  }, []);

  return null;
}
