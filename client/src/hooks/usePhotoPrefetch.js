import { useEffect } from 'react';
import { photoUrl } from '../lib/asset-url';

const PREFETCH_WIDTH = 400;

export function usePhotoPrefetch(people) {
  useEffect(() => {
    if (!people || !people.length) {
      return;
    }

    const idle = window.requestIdleCallback || ((cb) => window.setTimeout(cb, 1));
    let cancelled = false;

    idle(() => {
      if (cancelled) {
        return;
      }

      people.forEach((person) => {
        if (!person.photo) {
          return;
        }

        const img = new Image();
        img.src = photoUrl(person.photo, { width: PREFETCH_WIDTH });
      });
    });

    return () => {
      cancelled = true;
    };
  }, [people]);
}
