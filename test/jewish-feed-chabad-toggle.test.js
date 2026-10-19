const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { isChabadDatesEnabled, normalizeBoardFeatures } = require('../lib/board-features');

describe('chabad dates board feature', () => {
  it('defaults to enabled when unset', () => {
    assert.equal(isChabadDatesEnabled({}), true);
    assert.equal(normalizeBoardFeatures({}).chabadDates, true);
  });

  it('can be disabled per community', () => {
    assert.equal(isChabadDatesEnabled({ chabadDates: false }), false);
    assert.equal(isChabadDatesEnabled({ chabadDates: true }), true);
  });
});
