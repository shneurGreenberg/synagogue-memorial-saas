import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

const BOARD_LEAVE_MS = 280;

const BoardNavigationContext = createContext(null);

export function BoardNavigationProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams();

  useEffect(() => {
    document.documentElement.classList.remove('board-leaving');
  }, [location.pathname]);

  const navigateWithTransition = useCallback((to) => {
    if (document.documentElement.classList.contains('board-leaving')) {
      return;
    }

    document.documentElement.classList.add('board-leaving');
    window.setTimeout(() => {
      navigate(to);
    }, BOARD_LEAVE_MS);
  }, [navigate]);

  const value = useMemo(() => ({
    goToCard: (personId) => navigateWithTransition(`card/${personId}`),
    goToBoard: () => navigateWithTransition(`/s/${slug}`),
  }), [navigateWithTransition, slug]);

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
