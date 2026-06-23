import React from 'react';
import { useTranslation } from 'react-i18next';

export function BaruchHashemBadge() {
  const { t } = useTranslation();

  return (
    <div className="baruch-hashem-badge" aria-hidden="true">
      {t('baruch_hashem')}
    </div>
  );
}
