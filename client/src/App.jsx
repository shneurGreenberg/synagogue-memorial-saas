import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import BoardLayout from './BoardLayout';
import HomePage from './pages/HomePage';
import CardPage from './pages/CardPage';

export default function App() {
  return (
    <Routes>
      <Route path="/s/:slug" element={<BoardLayout />}>
        <Route index element={<HomePage />} />
        <Route path="card/:personId" element={<CardPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
