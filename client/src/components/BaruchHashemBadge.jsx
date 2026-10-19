import React from 'react';

export function BaruchHashemBadge({ placement = 'fixed' }) {
  const className = placement === 'column'
    ? 'baruch-hashem-badge baruch-hashem-badge--column'
    : 'baruch-hashem-badge';

  return (
    <div className={className} aria-hidden="true">
      ב״ה
    </div>
  );
}
