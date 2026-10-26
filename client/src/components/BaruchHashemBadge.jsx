import React from 'react';

export function BaruchHashemBadge({ placement = 'fixed' }) {
  let className = 'baruch-hashem-badge';
  if (placement === 'column') className += ' baruch-hashem-badge--column';
  if (placement === 'outside') className += ' baruch-hashem-badge--outside';

  return (
    <div className={className} aria-hidden="true">
      ב״ה
    </div>
  );
}
