import { useEffect } from 'react';
import { getBoardData } from '../lib/board-data';
import { isBrowserOffline } from '../lib/network-backoff';

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

      // 1.30.1 I19: never reload while offline — that would blank the board until the network returns.
      if (idleMs >= reloadAfter && !isBrowserOffline()) {
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
