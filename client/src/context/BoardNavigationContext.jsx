import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const BoardNavigationContext = createContext(null);

export function BoardNavigationProvider({ children }) {
  const navigate = useNavigate();
  const { slug } = useParams();

  const goToCard = useCallback((personId) => {
    navigate(`card/${personId}`);
  }, [navigate]);

  const goToBoard = useCallback(() => {
    navigate(`/s/${slug}`, { replace: true });
  }, [navigate, slug]);

  const value = useMemo(() => ({
    goToCard,
    goToBoard,
  }), [goToCard, goToBoard]);

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
