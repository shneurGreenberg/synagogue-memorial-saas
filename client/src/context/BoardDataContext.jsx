import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getDisplayLanguage } from '../lib/person-names';
import { applyBoardLanguage, initBoardLanguage } from '../lib/board-language';
import { getPreviewLanguage, isBoardPreviewMode } from '../lib/board-preview-mode';
import {
  BOARD_PREVIEW_MESSAGE,
  mergePreviewPatch,
  previewPatchFromSearchParams,
} from '../lib/board-preview-overrides';
import { isStaticSite } from '../lib/asset-url';

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
    communityEvents: data.communityEvents,
    boardFeatures: data.boardFeatures,
    shabbatTimesEnabled: data.shabbatTimesEnabled,
  });
}

function initialBoardData() {
  const base = window.data || {};
  const patch = previewPatchFromSearchParams(new URLSearchParams(window.location.search));

  if (!patch) {
    return base;
  }

  return mergePreviewPatch(base, patch);
}

export function BoardDataProvider({ slug, children }) {
  const previewMode = isBoardPreviewMode();
  const [data, setData] = useState(initialBoardData);
  const [revision, setRevision] = useState(0);
  const [uiLang, setUiLangState] = useState(() => {
    if (previewMode) {
      const previewLang = getPreviewLanguage();
      if (previewLang) {
        return previewLang;
      }
    }

    return getDisplayLanguage();
  });

  const setUiLang = useCallback((lang) => {
    const safe = applyBoardLanguage(lang);
    setUiLangState(safe);
  }, []);

  useEffect(() => {
    applyBoardLanguage(uiLang);
  }, [uiLang]);

  const applyData = useCallback((next) => {
    window.data = next;
    setData(next);
    setRevision((value) => value + 1);
  }, []);

  const applyPreviewPatch = useCallback((patch) => {
    if (!patch) {
      return;
    }

    setData((current) => {
      const next = mergePreviewPatch(current, patch);
      window.data = next;
      return next;
    });
    setRevision((value) => value + 1);

    if (patch.previewLang && ['ru', 'en', 'he'].includes(patch.previewLang)) {
      setUiLang(patch.previewLang);
    }
  }, [setUiLang]);

  useEffect(() => {
    if (!previewMode) {
      return undefined;
    }

    function onMessage(event) {
      if (event.origin !== window.location.origin) {
        return;
      }

      const payload = event.data;
      if (!payload || payload.type !== BOARD_PREVIEW_MESSAGE) {
        return;
      }

      applyPreviewPatch(payload);
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [previewMode, applyPreviewPatch]);

  useEffect(() => {
    if (!slug || previewMode) {
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
  }, [slug, applyData, previewMode]);

  const value = useMemo(
    () => ({ data, revision, uiLang, setUiLang, applyPreviewPatch }),
    [data, revision, uiLang, setUiLang, applyPreviewPatch],
  );

  return (
    <BoardDataContext.Provider value={value}>
      {children}
    </BoardDataContext.Provider>
  );
}

export function useBoardData() {
  const ctx = useContext(BoardDataContext);

  if (!ctx) {
    return { data: getBoardDataFallback(), revision: 0, uiLang: getDisplayLanguage() };
  }

  return ctx;
}

function getBoardDataFallback() {
  return window.data || {};
}
