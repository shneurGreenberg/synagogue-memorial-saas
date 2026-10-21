import React from 'react';
import { withTranslation } from 'react-i18next';
import { useBoardData } from '../context/BoardDataContext';
import { assetUrl } from '../lib/asset-url';
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

function DonationQrPanelBase({ t }) {
  const { data } = useBoardData();
  const panel = data.memorialQrPanel || {};
  const publicSubmission = data.publicSubmission || {};
  if (publicSubmission.showDonationQr === false) {
    return null;
  }

  const hasDonationPanel = Boolean(
    String(publicSubmission.donationQrImage || '').trim()
    || String(publicSubmission.donationUrl || '').trim(),
  );
  if (!hasDonationPanel) {
    return null;
  }

  const title = String(panel.donationTitleText || '').trim() || t('donation_qr_title');
  const text = String(panel.donationTextText || '').trim() || t('donation_qr_scan');
  const titleScale = effectiveMemorialQrScale(panel, 'titleScale');
  const textScale = effectiveMemorialQrScale(panel, 'textScale');
  const qrScale = effectiveMemorialQrScale(panel, 'qrScale');
  const qrSrc = resolveQrSrc(publicSubmission.donationQrImage, 'images/donation-qr.svg');

  const qrImage = (
    <img
      className="memorial-submission-qr"
      src={qrSrc}
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
        <div className="memorial-submission-qr-frame" aria-hidden="true">
          {qrImage}
        </div>
      </div>
    </section>
  );
}

export const DonationQrPanel = withTranslation()(DonationQrPanelBase);
