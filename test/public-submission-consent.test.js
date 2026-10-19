const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseDataConsentFromBody,
  validateDataConsent,
} = require('../lib/public-submission-consent');

describe('public submission consent (S4)', () => {
  it('parses checkbox consent from body', () => {
    assert.equal(parseDataConsentFromBody({ dataConsent: '1' }), true);
    assert.equal(parseDataConsentFromBody({}), false);
  });

  it('requires explicit consent', () => {
    assert.equal(validateDataConsent(true), true);
    assert.equal(validateDataConsent(false), false);
  });
});
