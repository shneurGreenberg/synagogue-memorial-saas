import React from 'react';
import { withTranslation } from 'react-i18next';
import { assetUrl } from '../lib/asset-url';

class MemorialSubmissionPanelBase extends React.Component {
  render() {
    const { t } = this.props;

    return (
      <section className="memorial-submission-panel" aria-label={t('memorial_submission_title')}>
        <h2>{t('memorial_submission_title')}</h2>
        <p className="memorial-submission-text">{t('memorial_submission_scan')}</p>
        <img
          className="memorial-submission-qr"
          src={assetUrl('images/memorial-submission-qr.svg')}
          alt={t('memorial_submission_qr_alt')}
          decoding="async"
        />
      </section>
    );
  }
}

export const MemorialSubmissionPanel = withTranslation()(MemorialSubmissionPanelBase);
