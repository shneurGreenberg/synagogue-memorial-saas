import React from 'react';
import { BOARD_VERSION } from '../lib/board-version';

export function BoardVersionBadge() {
  return (
    <div className="board-version" aria-hidden="true">
      v
      {BOARD_VERSION}
    </div>
  );
}
