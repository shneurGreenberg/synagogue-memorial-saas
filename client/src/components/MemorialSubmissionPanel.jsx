import React from 'react';
import { withTranslation } from 'react-i18next';
import { useBoardData } from '../context/BoardDataContext';
import { assetUrl } from '../lib/asset-url';

function MemorialSubmissionPanelBase({ t }) {
  const { data, uiLang } = useBoardData();
  const panel = data.memorialQrPanel || {};
  const lang = uiLang || data.language || 'ru';
  const titles = panel.titles || {};
  const texts = panel.texts || {};
  const title = titles[lang] || t('memorial_submission_title');
  const text = texts[lang] || t('memorial_submission_scan');
  const titleScale = (Number(panel.titleScale) || 100) / 100;
  const textScale = (Number(panel.textScale) || 100) / 100;
  const qrScale = (Number(panel.qrScale) || 140) / 100;

  return (
    <section
      className="memorial-submission-panel"
      aria-label={title}
      style={{
        '--memorial-qr-title-scale': titleScale,
        '--memorial-qr-text-scale': textScale,
        '--memorial-qr-size-scale': qrScale,
      }}
    >
      <h2>{title}</h2>
      <p className="memorial-submission-text">{text}</p>
      <img
        className="memorial-submission-qr"
        src={assetUrl('images/memorial-submission-qr.svg')}
        alt={t('memorial_submission_qr_alt')}
        decoding="async"
      />
    </section>
  );
}

export const MemorialSubmissionPanel = withTranslation()(MemorialSubmissionPanelBase);
