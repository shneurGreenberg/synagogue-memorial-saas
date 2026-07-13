import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getDisplayLanguage } from '../lib/person-names';
import { applyBoardLanguage } from '../lib/board-language';
import { getPreviewLanguage, isBoardPreviewMode } from '../lib/board-preview-mode';
import {
  BOARD_PREVIEW_MESSAGE,
  mergePreviewPatch,
  previewPatchFromSearchParams,
} from '../lib/board-preview-overrides';
import { isStaticSite } from '../lib/asset-url';
import {
  getBoardTimezone,
  getDayKeyInTimezone,
  subscribeToCalendarDayChange,
} from '../lib/board-calendar';
import { resolveBoardTimezone } from '../lib/timezone';
import { mergeBoardPayload } from '../lib/board-payload';

const POLL_MS = 8000;
const HIDDEN_POLL_MS = 60000;

const BoardDataContext = createContext(null);

function initialBoardData() {
  const base = window.data || {};
  const patch = previewPatchFromSearchParams(new URLSearchParams(window.location.search));

  if (!patch) {
    return base;
  }

  return mergePreviewPatch(base, patch);
}

function readEmbeddedContentVersion() {
  if (typeof window === 'undefined') {
    return null;
  }

  const value = window.boardContentVersion || (window.data && window.data.contentVersion);
  return value ? String(value) : null;
}

export function BoardDataProvider({ slug, children }) {
  const previewMode = isBoardPreviewMode();
  const [data, setData] = useState(initialBoardData);
  const [revision, setRevision] = useState(0);
  const [calendarDayKey, setCalendarDayKey] = useState(() => getDayKeyInTimezone(getBoardTimezone()));
  const boardVersionRef = useRef(readEmbeddedContentVersion());
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

  const applyData = useCallback((next, { preserveText = true } = {}) => {
    setData((current) => {
      const merged = mergeBoardPayload(current, next, { preserveText });
      window.data = merged;
      return merged;
    });
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
    if (!slug || previewMode || isStaticSite()) {
      return undefined;
    }

    let cancelled = false;
    let timer = null;

    const fetchBoard = async () => {
      const headers = { Accept: 'application/json' };
      if (boardVersionRef.current) {
        headers['If-None-Match'] = `"${boardVersionRef.current}"`;
      }

      const response = await fetch(`/s/${slug}/api/board?slim=1`, {
        cache: 'no-store',
        headers,
      });

      if (cancelled) {
        return null;
      }

      if (response.status === 304) {
        return null;
      }

      if (!response.ok) {
        return null;
      }

      const etag = response.headers.get('ETag');
      const next = await response.json();
      if (etag) {
        boardVersionRef.current = etag.replace(/"/g, '');
      } else if (next && next.contentVersion) {
        boardVersionRef.current = String(next.contentVersion);
      }

      return next;
    };

    const poll = async () => {
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }

      try {
        const versionResponse = await fetch(`/s/${slug}/api/board/version`, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });

        if (!versionResponse.ok || cancelled) {
          return;
        }

        const { version } = await versionResponse.json();
        if (boardVersionRef.current && boardVersionRef.current === version) {
          return;
        }

        const next = await fetchBoard();
        if (!next || cancelled) {
          if (version) {
            boardVersionRef.current = version;
          }
          return;
        }

        boardVersionRef.current = version;
        applyData(next);
      } catch {
        /* ignore network errors between polls */
      }
    };

    const schedule = () => {
      if (timer) {
        window.clearInterval(timer);
      }
      const interval = (typeof document !== 'undefined' && document.hidden) ? HIDDEN_POLL_MS : POLL_MS;
      timer = window.setInterval(poll, interval);
    };

    // Initial HTML already embeds slim board data. Only re-fetch if we lack a content version.
    if (!boardVersionRef.current) {
      fetchBoard().then(async (next) => {
        if (!next || cancelled) {
          return;
        }

        applyData(next);

        try {
          const versionResponse = await fetch(`/s/${slug}/api/board/version`, {
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          });
          if (versionResponse.ok) {
            const { version } = await versionResponse.json();
            boardVersionRef.current = version;
          }
        } catch {
          /* ignore */
        }
      }).catch(() => {
        /* ignore initial fetch errors */
      });
    }

    schedule();

    const onVisibility = () => {
      schedule();
      if (!document.hidden) {
        poll();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      if (timer) {
        window.clearInterval(timer);
      }
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [slug, applyData, previewMode]);

  useEffect(() => {
    const timezone = resolveBoardTimezone(data);
    setCalendarDayKey(getDayKeyInTimezone(timezone));
    return subscribeToCalendarDayChange(setCalendarDayKey, timezone);
  }, [data.location?.timezone, data.location?.city]);

  const value = useMemo(
    () => ({ data, revision, calendarDayKey, uiLang, setUiLang, applyPreviewPatch }),
    [data, revision, calendarDayKey, uiLang, setUiLang, applyPreviewPatch],
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
    return {
      data: getBoardDataFallback(),
      revision: 0,
      calendarDayKey: getDayKeyInTimezone(getBoardTimezone()),
      uiLang: getDisplayLanguage(),
    };
  }

  return ctx;
}

function getBoardDataFallback() {
  return window.data || {};
}
