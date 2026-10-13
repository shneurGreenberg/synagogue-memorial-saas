const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseFormCheckbox } = require('../lib/public-submission');
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
});
