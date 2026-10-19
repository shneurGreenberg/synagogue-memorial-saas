const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('public submission always enabled (Y10)', () => {
  it('route handlers do not gate on publicSubmission.enabled', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'routes', 'public-submission.js'), 'utf8');
    assert.doesNotMatch(source, /publicSubmission\.enabled/);
    assert.doesNotMatch(source, /add-name-disabled/);
  });

  it('admin dashboard template omits publicSubmissionEnabled toggle', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'views', 'admin', 'dashboard.handlebars'), 'utf8');
    assert.doesNotMatch(html, /id="publicSubmissionEnabled"/);
    assert.match(html, /\/add-name/);
  });

  it('admin settings POST no longer updates publicSubmission.enabled', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'routes', 'admin.js'), 'utf8');
    assert.doesNotMatch(source, /publicSubmission\.enabled'\]/);
  });
});
