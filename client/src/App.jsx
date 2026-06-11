import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import BoardLayout from './BoardLayout';

export default function App() {
  return (
    <Routes>
      <Route path="/s/:slug/*" element={<BoardLayout />} />
      <Route path="*" element={<Navigate to="/s/novosibirsk" replace />} />
    </Routes>
  );
}
