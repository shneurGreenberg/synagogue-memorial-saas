const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseFormCheckbox, parsePublicSubmissionFromBody } = require('../lib/public-submission');
describe('parseFormCheckbox', () => {
  it('treats hidden 0 as unchecked', () => {
    assert.equal(parseFormCheckbox({ publicSubmissionShowRegistrationQr: '0' }, 'publicSubmissionShowRegistrationQr'), false);
  });

  it('treats hidden 0 plus checkbox 1 as checked', () => {
    assert.equal(
      parseFormCheckbox({ publicSubmissionShowDonationQr: ['0', '1'] }, 'publicSubmissionShowDonationQr'),
      true,
    );
  });

  it('persists QR toggles false when only hidden 0 is submitted', () => {
    const parsed = parsePublicSubmissionFromBody({
      publicSubmissionShowDonationQr: '0',
      publicSubmissionShowRegistrationQr: '0',
    });
    assert.equal(parsed.showDonationQr, false);
    assert.equal(parsed.showRegistrationQr, false);
  });
});
