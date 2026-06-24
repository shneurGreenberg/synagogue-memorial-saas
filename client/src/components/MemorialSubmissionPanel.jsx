import React from 'react';
import { withTranslation } from 'react-i18next';
import { useBoardData } from '../context/BoardDataContext';
import { assetUrl } from '../lib/asset-url';
import { getBoardSlug } from '../lib/board-slug';

function MemorialSubmissionPanelBase({ t }) {
  const { data } = useBoardData();
  const panel = data.memorialQrPanel || {};
  const title = t('memorial_submission_title');
  const text = t('memorial_submission_scan');
  const titleScale = (Number(panel.titleScale) || 100) / 100;
  const textScale = (Number(panel.textScale) || 100) / 100;
  const qrScale = (Number(panel.qrScale) || 140) / 100;
  const slug = data.slug || getBoardSlug();
  const addNameUrl = slug ? `/s/${slug}/add-name` : '';

  const qrImage = (
    <img
      className="memorial-submission-qr"
      src={assetUrl('images/memorial-submission-qr.svg')}
      alt={t('memorial_submission_qr_alt')}
      decoding="async"
    />
  );

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
      <div className="memorial-submission-qr-header">
        <h2>{title}</h2>
        <p className="memorial-submission-text">{text}</p>
      </div>
      <div className="memorial-submission-qr-body">
        {addNameUrl ? (
          <a href={addNameUrl} className="memorial-submission-qr-link" aria-label={t('memorial_submission_qr_alt')}>
            {qrImage}
          </a>
        ) : (
          qrImage
        )}
      </div>
    </section>
  );
}

export const MemorialSubmissionPanel = withTranslation()(MemorialSubmissionPanelBase);
