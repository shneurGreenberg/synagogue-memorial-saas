import React from 'react';
import { useBoardData } from '../context/BoardDataContext';
import { buildGoogleFontsHref, normalizeBoardFont } from '../lib/board-fonts';

export function BoardFontLoader() {
  const { data } = useBoardData();
  const fontId = normalizeBoardFont(data?.theme?.boardFont);
  const href = buildGoogleFontsHref(fontId);

  if (!href) {
    return null;
  }

  return (
    <link rel="stylesheet" href={href} />
  );
}
