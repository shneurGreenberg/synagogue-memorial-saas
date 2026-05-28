import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getDisplayLanguage, setDisplayLanguage } from '../lib/person-names';
import i18n from '../lib/i18n';

const POLL_MS = 8000;

const BoardDataContext = createContext(null);

function snapshotForCompare(data) {
  if (!data) {
    return '';
  }

  return JSON.stringify({
    title: data.title,
    titles: data.titles,
    language: data.language,
    weeklyChapterEnabled: data.weeklyChapterEnabled,
    theme: data.theme,
    slideshow: data.slideshow,
    people: data.people,
    dailyCites: data.dailyCites,
  });
}

export function BoardDataProvider({ slug, children }) {
  const [data, setData] = useState(() => window.data || {});
  const [revision, setRevision] = useState(0);
  const [uiLang, setUiLangState] = useState(() => getDisplayLanguage());

  const setUiLang = useCallback((lang) => {
    const safe = ['ru', 'he', 'en'].includes(lang) ? lang : 'ru';
    setDisplayLanguage(safe);
    i18n.changeLanguage(safe);
    setUiLangState(safe);
  }, []);

  const applyData = useCallback((next) => {
    window.data = next;
    setData(next);
    setRevision((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!slug) {
      return undefined;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch(`/s/${slug}/api/board`, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });

        if (!response.ok || cancelled) {
          return;
        }

        const next = await response.json();
        const currentSnap = snapshotForCompare(window.data);
        const nextSnap = snapshotForCompare(next);

        if (currentSnap !== nextSnap) {
          applyData(next);
        }
      } catch {
        /* ignore network errors between polls */
      }
    };

    poll();
    const timer = window.setInterval(poll, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [slug, applyData]);

  const value = useMemo(() => ({ data, revision, uiLang, setUiLang }), [data, revision, uiLang, setUiLang]);

  return (
    <BoardDataContext.Provider value={value}>
      {children}
    </BoardDataContext.Provider>
  );
}

export function useBoardData() {
  const ctx = useContext(BoardDataContext);

  if (!ctx) {
    return { data: getBoardDataFallback(), revision: 0 };
  }

  return ctx;
}

function getBoardDataFallback() {
  return window.data || {};
}
