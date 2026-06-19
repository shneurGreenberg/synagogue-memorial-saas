import React from 'react';
import { useMatch, useParams } from 'react-router-dom';
import { BoardNavigationProvider } from './context/BoardNavigationContext';
import { BoardDataProvider } from './context/BoardDataContext';
import { ThemeStyles } from './components/ThemeStyles';
import { IdleReload } from './components/IdleReload';
import { useBoardData } from './context/BoardDataContext';
import { BoardLanguageSwitcher } from './components/BoardLanguageSwitcher';
import { BoardVersionBadge } from './components/BoardVersionBadge';
import HomePage from './pages/HomePage';
import CardPage from './pages/CardPage';

function BoardLayoutInner() {
  const { data } = useBoardData();
  const cardMatch = useMatch('/s/:slug/card/:personId');
  const personId = cardMatch?.params?.personId;

  return (
    <BoardNavigationProvider>
      <ThemeStyles />
      <IdleReload />
      <BoardVersionBadge />
      <BoardLanguageSwitcher />
      <div id="main-entry">
        <HomePage />
        {personId ? <CardPage personId={personId} /> : null}
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
