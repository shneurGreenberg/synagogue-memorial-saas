import { useEffect } from 'react';

export function usePhotoPrefetch(people) {
  useEffect(() => {
    if (!people || !people.length) {
      return;
    }

    const idle = window.requestIdleCallback || ((cb) => window.setTimeout(cb, 1));

    idle(() => {
      people.forEach((person) => {
        if (!person.photo) {
          return;
        }

        const img = new Image();
        img.src = `/photos/${person.photo}`;
      });
    });
  }, [people]);
}
