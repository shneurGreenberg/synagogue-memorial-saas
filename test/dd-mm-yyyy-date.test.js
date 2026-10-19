const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseDdMmYyyy,
  formatDdMmYyyy,
  formatDdMmYyyyFromIso,
  maskDdMmYyyyInput,
} = require('../lib/dd-mm-yyyy-date');

describe('dd-mm-yyyy-date', () => {
  it('parses and formats dd.mm.yyyy', () => {
    assert.deepEqual(parseDdMmYyyy('15.03.2020'), { year: 2020, month: 3, date: 15 });
    assert.equal(formatDdMmYyyy({ year: 2020, month: 3, date: 15 }), '15.03.2020');
    assert.equal(formatDdMmYyyyFromIso('2020-03-15'), '15.03.2020');
  });

  it('rejects US slash dates and invalid calendar dates', () => {
    assert.equal(parseDdMmYyyy('03/15/2020'), null);
    assert.equal(parseDdMmYyyy('31.02.2020'), null);
    assert.equal(parseDdMmYyyy('32.01.2020'), null);
  });

  it('masks digit input as dd.mm.yyyy', () => {
    assert.equal(maskDdMmYyyyInput('15032020'), '15.03.2020');
    assert.equal(maskDdMmYyyyInput('1'), '1');
  });
});
