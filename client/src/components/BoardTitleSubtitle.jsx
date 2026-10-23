import React from 'react';

export function BoardTitleSubtitle({ subtitle }) {
  const enabled = subtitle?.enabled === true;
  const text = String(subtitle?.text || '').trim();
  if (!enabled || !text) {
    return null;
  }

  return (
    <p className="board-header-subtitle">
      {text}
    </p>
  );
}
