const {
  isHayomYomTranslationPlaceholder,
  sanitizeHayomYomText,
} = require('./hayom-yom-sanitize');

function getHayomYomDisplayText(text, fallback = '') {
  const cleaned = sanitizeHayomYomText(text);
  if (!cleaned || isHayomYomTranslationPlaceholder(cleaned)) {
    return sanitizeHayomYomText(fallback);
  }
  return cleaned;
}

module.exports = {
  getHayomYomDisplayText,
};
