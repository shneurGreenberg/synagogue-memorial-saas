import React from 'react';
import { withTranslation } from 'react-i18next';
import { useBoardData } from '../context/BoardDataContext';
import { assetUrl } from '../lib/asset-url';
import { getBoardSlug } from '../lib/board-slug';
import { effectiveMemorialQrScale } from '../lib/typography-baseline';

function resolveQrSrc(customPath, defaultRelativePath) {
  const custom = String(customPath || '').trim();
  if (custom) {
    if (custom.startsWith('provisioning/')) {
      return assetUrl(`images/${custom}`);
    }
    return assetUrl(`images/${custom.replace(/^\/+/, '')}`);
  }
  return assetUrl(defaultRelativePath);
}

function MemorialSubmissionPanelBase({ t }) {
  const { data } = useBoardData();
  const panel = data.memorialQrPanel || {};
  const publicSubmission = data.publicSubmission || {};
  const title = t('memorial_submission_title');
  const text = t('memorial_submission_scan');
  const titleScale = effectiveMemorialQrScale(panel, 'titleScale');
  const textScale = effectiveMemorialQrScale(panel, 'textScale');
  const qrScale = effectiveMemorialQrScale(panel, 'qrScale');
  const slug = data.slug || getBoardSlug();
  const addNameUrl = slug ? `/s/${slug}/add-name` : '';
  const qrSrc = resolveQrSrc(publicSubmission.registrationQrImage, 'images/memorial-submission-qr.svg');

  const qrImage = (
    <img
      className="memorial-submission-qr"
      src={qrSrc}
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
          <div className="memorial-submission-qr-link memorial-submission-qr-frame" aria-hidden="true">
            {qrImage}
          </div>
        )}
      </div>
    </section>
  );
}

export const MemorialSubmissionPanel = withTranslation()(MemorialSubmissionPanelBase);
