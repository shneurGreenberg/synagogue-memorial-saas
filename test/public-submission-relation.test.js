const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getPublicSubmissionTranslator } = require('../lib/public-submission-i18n');
const { parseRelationFromBody } = require('../lib/submission-relation');

describe('public submission relation field', () => {
  it('exposes localized select placeholders (X3)', () => {
    assert.equal(getPublicSubmissionTranslator('he')('relation_select_placeholder'), 'בחר…');
    assert.equal(getPublicSubmissionTranslator('ru')('relation_select_placeholder'), 'Выберите…');
    assert.equal(getPublicSubmissionTranslator('en')('relation_select_placeholder'), 'Select…');
  });

  it('requires relation other text only when key is other', () => {
    const other = parseRelationFromBody({ relationKey: 'other', relationOther: 'אחיין' }, 'he');
    assert.equal(other.relation, 'אחיין');
    const ben = parseRelationFromBody({ relationKey: 'ben', relationOther: '' }, 'he');
    assert.equal(ben.relation, 'בן');
  });
});
