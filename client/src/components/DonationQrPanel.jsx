import React from 'react';
import { withTranslation } from 'react-i18next';
import { useBoardData } from '../context/BoardDataContext';
import { assetUrl } from '../lib/asset-url';

function DonationQrPanelBase({ t }) {
  const { data } = useBoardData();
  const panel = data.memorialQrPanel || {};
  const publicSubmission = data.publicSubmission || {};
  const donationUrl = String(publicSubmission.donationUrl || '').trim();

  if (!donationUrl) {
    return null;
  }

  const title = t('donation_qr_title');
  const text = t('donation_qr_scan');
  const titleScale = (Number(panel.titleScale) || 100) / 100;
  const textScale = (Number(panel.textScale) || 100) / 100;
  const qrScale = (Number(panel.qrScale) || 140) / 100;

  const qrImage = (
    <img
      className="memorial-submission-qr"
      src={assetUrl('images/donation-qr.svg')}
      alt={t('donation_qr_alt')}
      decoding="async"
    />
  );

  return (
    <section
      className="memorial-submission-panel donation-qr-panel"
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
        <a
          href={donationUrl}
          className="memorial-submission-qr-link"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('donation_qr_alt')}
        >
          {qrImage}
        </a>
      </div>
    </section>
  );
}

export const DonationQrPanel = withTranslation()(DonationQrPanelBase);
