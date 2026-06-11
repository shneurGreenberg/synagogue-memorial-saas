import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { useMatch, useNavigate, useParams } from 'react-router-dom';

const BoardNavigationContext = createContext(null);

export function BoardNavigationProvider({ children }) {
  const navigate = useNavigate();
  const { slug } = useParams();
  const cardMatch = useMatch('/s/:slug/card/:personId');
  const isCardOpen = Boolean(cardMatch);

  const goToCard = useCallback((personId) => {
    navigate(`card/${personId}`);
  }, [navigate]);

  const goToBoard = useCallback(() => {
    if (!isCardOpen) {
      return;
    }

    navigate(`/s/${slug}`, { replace: true });
  }, [isCardOpen, navigate, slug]);

  const value = useMemo(() => ({
    goToCard,
    goToBoard,
    isCardOpen,
  }), [goToCard, goToBoard, isCardOpen]);

  return (
    <BoardNavigationContext.Provider value={value}>
      {children}
    </BoardNavigationContext.Provider>
  );
}

export function useBoardNavigation() {
  const ctx = useContext(BoardNavigationContext);

  if (!ctx) {
    throw new Error('useBoardNavigation must be used within BoardNavigationProvider');
  }

  return ctx;
}
