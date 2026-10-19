const { getPublicSubmissionTranslator } = require('./public-submission-i18n');

function formatDeceasedCardBadge(lang, index) {
  const t = getPublicSubmissionTranslator(lang);
  const n = Number(index);
  if (!Number.isFinite(n) || n < 1) {
    return t('deceased_block_title');
  }
  return `${t('deceased_block_title')} ${n}`;
}

function formatPublicSubmitLabel(lang, count, options = {}) {
  const submitKey = options.submitKey || 'submit';
  const t = getPublicSubmissionTranslator(lang);
  const c = Number(count);
  if (!Number.isFinite(c) || c <= 1) {
    return t(submitKey);
  }
  return `${t(submitKey)} (${c} ${t('deceased_count_unit')})`;
}

module.exports = {
  formatDeceasedCardBadge,
  formatPublicSubmitLabel,
};
