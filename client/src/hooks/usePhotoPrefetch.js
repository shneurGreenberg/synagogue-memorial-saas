import { useEffect } from 'react';
import { photoUrl } from '../lib/asset-url';

const PREFETCH_WIDTH = 400;
const PREFETCH_LIMIT = 16;
const PREFETCH_CONCURRENCY = 3;

export function usePhotoPrefetch(people) {
  useEffect(() => {
    if (!people || !people.length) {
      return undefined;
    }

    const idle = window.requestIdleCallback || ((cb) => window.setTimeout(cb, 1));
    let cancelled = false;
    let idleId = null;

    idleId = idle(() => {
      if (cancelled) {
        return;
      }

      const queue = people
        .filter((person) => person && person.photo)
        .slice(0, PREFETCH_LIMIT)
        .map((person) => photoUrl(person.photo, { width: PREFETCH_WIDTH }));

      let index = 0;

      const pump = () => {
        if (cancelled) {
          return;
        }

        while (index < queue.length) {
          const batch = queue.slice(index, index + PREFETCH_CONCURRENCY);
          index += PREFETCH_CONCURRENCY;
          batch.forEach((src) => {
            const img = new Image();
            img.decoding = 'async';
            img.src = src;
          });
          break;
        }

        if (index < queue.length) {
          window.setTimeout(pump, 120);
        }
      };

      pump();
    });

    return () => {
      cancelled = true;
      if (typeof window.cancelIdleCallback === 'function' && idleId != null) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, [people]);
}
