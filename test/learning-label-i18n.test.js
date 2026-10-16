const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { localizePlainLearningLabel } = require('../lib/learning-label-i18n');
const { resetQuotaBackoff } = require('../lib/mymemory-translate');

describe('learning label i18n', () => {
  beforeEach(() => {
    resetQuotaBackoff();
  });

  it('uses cached API translation when dictionary leaves English unchanged', async () => {
    const StoredTranslation = require('../models/StoredTranslation');
    const originalFind = StoredTranslation.findOne;
    const originalUpdate = StoredTranslation.findOneAndUpdate;
    StoredTranslation.findOne = () => ({
      lean: async () => null,
    });
    StoredTranslation.findOneAndUpdate = async () => {};

    const httpsGet = (_url, _opts, callback) => {
      const body = JSON.stringify([[['Обычная строка', 'Plain line', null, null, 3]]]);
      callback({ statusCode: 200, on: (event, handler) => {
        if (event === 'data') {
          handler(body);
        }
        if (event === 'end') {
          handler();
        }
      } });
      return { on: () => {}, setTimeout: () => {} };
    };

    const label = await localizePlainLearningLabel('Plain line', 'ru', { httpsGet });
    assert.equal(label, 'Обычная строка');

    StoredTranslation.findOne = originalFind;
    StoredTranslation.findOneAndUpdate = originalUpdate;
  });
});
