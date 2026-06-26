import Hebcal from 'hebcal';
import React, { useEffect, useMemo } from 'react';
import { useBoardData } from '../context/BoardDataContext';
import { MemorialCard } from '../components/MemorialCard';
import { isPersonYahrzeitToday } from '../lib/yahrzeit-today';
import { resolveBoardTimezone } from '../lib/timezone';

function preparePerson(person, timezone) {
  if (!person || !person.gregorianDateOfDeath?.year) {
    return person;
  }

  const gregorianDateOfDeath = new Date(
    person.gregorianDateOfDeath.year,
    person.gregorianDateOfDeath.month - 1,
    person.gregorianDateOfDeath.date,
  );

  return {
    ...person,
    gregorianDateOfDeath,
    hebrewDateOfDeath: new Hebcal.HDate(gregorianDateOfDeath),
    passedToday: isPersonYahrzeitToday(person, timezone),
  };
}

export default function TileExportPage({ personId, highlightYahrzeit = false }) {
  const { data } = useBoardData();
  const timezone = resolveBoardTimezone(data);

  const person = useMemo(() => {
    const raw = (data.people || []).find((entry) => String(entry.id) === String(personId));
    if (!raw) {
      return null;
    }

    const prepared = preparePerson(raw, timezone);
    if (!highlightYahrzeit) {
      return prepared;
    }

    return {
      ...prepared,
      passedToday: true,
    };
  }, [data.people, personId, timezone, highlightYahrzeit]);

  useEffect(() => {
    document.body.classList.add('tile-export-mode');

    if (!person) {
      document.body.classList.add('tile-export-ready');
      return undefined;
    }

    let cancelled = false;
    const markReady = () => {
      if (!cancelled) {
        document.body.classList.add('tile-export-ready');
      }
    };

    const images = Array.from(document.querySelectorAll('.tile-export-board img'));
    const pending = images.filter((img) => !img.complete);

    if (!pending.length) {
      window.requestAnimationFrame(() => {
        window.setTimeout(markReady, 120);
      });
    } else {
      Promise.all(pending.map((img) => new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      }))).then(() => {
        window.setTimeout(markReady, 120);
      });
    }

    return () => {
      cancelled = true;
      document.body.classList.remove('tile-export-mode', 'tile-export-ready');
    };
  }, [person]);

  if (!person) {
    return (
      <main className="tile-export-board" aria-hidden="true">
        <p className="tile-export-missing">Not found</p>
      </main>
    );
  }

  return (
    <main className="tile-export-board" aria-hidden="true">
      <section className="middle tile-export-middle">
        <div className="wooden-panel">
          <div className="cards-area">
            <div className="cards-grid tile-export-grid">
              <div id="tileExportCard" className="tile-export-cell">
                <MemorialCard entry={person} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
