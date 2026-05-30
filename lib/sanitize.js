const sanitizeHtml = require('sanitize-html');

const ALLOWED_TAGS = [
  'p', 'br', 'b', 'i', 'em', 'strong', 'u', 'ul', 'ol', 'li', 'span', 'div', 'h1', 'h2', 'h3', 'h4',
];

const OPTIONS = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {},
  disallowedTagsMode: 'discard',
};

function sanitizeRichText(html) {
  if (!html) {
    return '';
  }

  return sanitizeHtml(String(html), OPTIONS);
}

module.exports = {
  sanitizeRichText,
};
