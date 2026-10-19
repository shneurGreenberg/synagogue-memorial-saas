const HONEYPOT_FIELD = 'companyWebsite';

function parseHoneypotFromBody(body) {
  const value = String((body && body[HONEYPOT_FIELD]) || '').trim();
  return value;
}

function isHoneypotTripped(body) {
  return !!parseHoneypotFromBody(body);
}

module.exports = {
  HONEYPOT_FIELD,
  parseHoneypotFromBody,
  isHoneypotTripped,
};
