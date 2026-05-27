import React from 'react';
import { Outlet } from 'react-router-dom';
import { BoardNavigationProvider } from './context/BoardNavigationContext';
import { ThemeStyles } from './components/ThemeStyles';
import { IdleReload } from './components/IdleReload';
import { usePhotoPrefetch } from './hooks/usePhotoPrefetch';
import { getBoardData } from './lib/board-data';

export default function BoardLayout() {
  const data = getBoardData();
  usePhotoPrefetch(data.people);

  return (
    <BoardNavigationProvider>
      <ThemeStyles />
      <IdleReload />
      <div id="main-entry">
        <Outlet />
      </div>
    </BoardNavigationProvider>
  );
}
