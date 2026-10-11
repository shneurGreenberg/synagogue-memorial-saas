import React from 'react';
import { isStaticSite } from '../lib/asset-url';

export function StaticSiteBanner() {
  if (!isStaticSite()) {
    return null;
  }

  const data = window.data || {};
  const exportedAt = data.exportedAt ? new Date(data.exportedAt) : null;
  const fallbackMessage = data._fallbackMessage;
  
  const dateStr = exportedAt 
    ? exportedAt.toLocaleDateString('ru-RU', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : '';

  return (
    <>
      {fallbackMessage && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          color: '#ffd54f',
          padding: '3rem 4rem',
          borderRadius: '16px',
          fontSize: '2rem',
          fontWeight: 'bold',
          textAlign: 'center',
          zIndex: 9000,
          border: '3px solid #d4af37',
          maxWidth: '80vw',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
        }}>
          {fallbackMessage}
        </div>
      )}
      {exportedAt && !fallbackMessage && (
        <div style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: '#ffd54f',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          fontSize: '0.85rem',
          zIndex: 8000,
          border: '1px solid rgba(212, 175, 55, 0.5)'
        }}>
          Резервная версия, данные на {dateStr}
        </div>
      )}
    </>
  );
}
