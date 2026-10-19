function resolvePublicSubmissionPhonePlaceholder(synagogueLang, formLang) {
  const communityLang = ['he', 'ru', 'en'].includes(synagogueLang) ? synagogueLang : 'ru';
  const lang = ['he', 'ru', 'en'].includes(formLang) ? formLang : communityLang;

  if (lang === 'he' || communityLang === 'he') {
    return '0501234567';
  }
  if (lang === 'ru' || communityLang === 'ru') {
    return '+79001234567';
  }
  if (communityLang === 'he') {
    return '0501234567';
  }
  return '+79001234567';
}

module.exports = {
  resolvePublicSubmissionPhonePlaceholder,
};
