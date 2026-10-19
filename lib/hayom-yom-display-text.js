const { sanitizeHayomYomText } = require('./hayom-yom-sanitize');

function getHayomYomDisplayText(text) {
  return sanitizeHayomYomText(text);
}

module.exports = {
  getHayomYomDisplayText,
};
