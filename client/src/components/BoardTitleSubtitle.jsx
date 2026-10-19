import React from 'react';
import { resolveBoardFontFamily, normalizeBoardFont } from '../lib/board-fonts';

export function BoardTitleSubtitle({ subtitle, theme }) {
  const enabled = subtitle?.enabled === true;
  const text = String(subtitle?.text || '').trim();
  if (!enabled || !text) {
    return null;
  }

  const boardTheme = theme || {};
  const subtitleFont = String(boardTheme.boardSubtitleFont || '').trim();
  const fontFamily = subtitleFont
    ? resolveBoardFontFamily(normalizeBoardFont(subtitleFont))
    : undefined;

  return (
    <p
      className="board-header-subtitle"
      style={{
        fontFamily: fontFamily || undefined,
        color: boardTheme.boardSubtitleColor || undefined,
        fontWeight: boardTheme.boardSubtitleWeight || undefined,
      }}
    >
      {text}
    </p>
  );
}
