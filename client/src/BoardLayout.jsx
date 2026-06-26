import React from 'react';
import { useMatch, useParams } from 'react-router-dom';
import { BoardNavigationProvider } from './context/BoardNavigationContext';
import { BoardDataProvider } from './context/BoardDataContext';
import { ThemeStyles } from './components/ThemeStyles';
import { IdleReload } from './components/IdleReload';
import { useBoardData } from './context/BoardDataContext';
import { BoardLanguageSwitcher } from './components/BoardLanguageSwitcher';
import { BoardVersionBadge } from './components/BoardVersionBadge';
import { BaruchHashemBadge } from './components/BaruchHashemBadge';
import HomePage from './pages/HomePage';
import CardPage from './pages/CardPage';
import TileExportPage from './pages/TileExportPage';

function BoardLayoutInner() {
  const cardMatch = useMatch('/s/:slug/card/:personId');
  const exportMatch = useMatch('/s/:slug/export/tile/:personId');
  const personId = cardMatch?.params?.personId;
  const exportPersonId = exportMatch?.params?.personId;
  const exportParams = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();
  const highlightYahrzeit = exportParams.get('yahrzeit') === '1';

  if (exportPersonId) {
    return (
      <>
        <ThemeStyles />
        <TileExportPage personId={exportPersonId} highlightYahrzeit={highlightYahrzeit} />
      </>
    );
  }

  return (
    <BoardNavigationProvider>
      <ThemeStyles />
      <IdleReload />
      <BoardVersionBadge />
      <BaruchHashemBadge />
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
