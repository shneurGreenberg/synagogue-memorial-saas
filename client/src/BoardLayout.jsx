import React from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { BoardNavigationProvider } from './context/BoardNavigationContext';
import { BoardDataProvider } from './context/BoardDataContext';
import { ThemeStyles } from './components/ThemeStyles';
import { IdleReload } from './components/IdleReload';
import { usePhotoPrefetch } from './hooks/usePhotoPrefetch';
import { useBoardData } from './context/BoardDataContext';

function BoardLayoutInner() {
  const { data } = useBoardData();
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

export default function BoardLayout() {
  const { slug } = useParams();

  return (
    <BoardDataProvider slug={slug}>
      <BoardLayoutInner />
    </BoardDataProvider>
  );
}
