import React, { Suspense, lazy } from 'react';
import { useMatch, useParams } from 'react-router-dom';
import { BoardNavigationProvider } from './context/BoardNavigationContext';
import { BoardDataProvider } from './context/BoardDataContext';
import { ThemeStyles } from './components/ThemeStyles';
import { IdleReload } from './components/IdleReload';
import { BoardVersionBadge } from './components/BoardVersionBadge';
import { BaruchHashemBadge } from './components/BaruchHashemBadge';
import HomePage from './pages/HomePage';

const CardPage = lazy(() => import('./pages/CardPage'));
const TileExportPage = lazy(() => import('./pages/TileExportPage'));

function BoardRouteFallback() {
  return null;
}

function BoardLayoutInner() {
  const cardMatch = useMatch('/s/:slug/card/:personId');
  const exportMatch = useMatch('/s/:slug/export/tile/:personId');
  const personId = cardMatch?.params?.personId;
  const exportPersonId = exportMatch?.params?.personId;
  const exportParams = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();
  const highlightYahrzeit = exportParams.get('yahrzeit') === '1';
  const cardExportMode = exportParams.get('export') === '1';
  const cardOpen = Boolean(personId && !cardExportMode);

  if (exportPersonId) {
    return (
      <>
        <ThemeStyles />
        <Suspense fallback={<BoardRouteFallback />}>
          <TileExportPage personId={exportPersonId} highlightYahrzeit={highlightYahrzeit} />
        </Suspense>
      </>
    );
  }

  if (cardMatch && cardExportMode) {
    return (
      <BoardNavigationProvider>
        <ThemeStyles />
        <Suspense fallback={<BoardRouteFallback />}>
          <CardPage personId={personId} exportMode />
        </Suspense>
      </BoardNavigationProvider>
    );
  }

  return (
    <BoardNavigationProvider>
      <ThemeStyles />
      <IdleReload />
      <BoardVersionBadge />
      <BaruchHashemBadge />
      <div id="main-entry" className={cardOpen ? 'board-card-open' : ''}>
        <div className={cardOpen ? 'board-home-paused' : ''} aria-hidden={cardOpen}>
          <HomePage paused={cardOpen} />
        </div>
        {personId ? (
          <Suspense fallback={<BoardRouteFallback />}>
            <CardPage personId={personId} />
          </Suspense>
        ) : null}
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
