const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { isHoneypotTripped, HONEYPOT_FIELD } = require('../lib/public-submission-honeypot');

describe('public submission honeypot (S9)', () => {
  it('trips when hidden field is filled', () => {
    assert.equal(isHoneypotTripped({ [HONEYPOT_FIELD]: '' }), false);
    assert.equal(isHoneypotTripped({ [HONEYPOT_FIELD]: 'spam' }), true);
  });
});
