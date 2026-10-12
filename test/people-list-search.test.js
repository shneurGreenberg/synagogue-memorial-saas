const test = require('node:test');
const assert = require('node:assert');
const {
  parsePeopleListSearchParam,
  personMatchesPeopleSearch,
  appendPeopleListQuery,
  buildWeeklyKaddishPeopleHref,
} = require('../lib/people-list-search');

test('parsePeopleListSearchParam decodes query values', () => {
  assert.strictEqual(parsePeopleListSearchParam('משה%20כהן'), 'משה כהן');
  assert.strictEqual(parsePeopleListSearchParam('John+Doe'), 'John Doe');
  assert.strictEqual(parsePeopleListSearchParam('  trimmed  '), 'trimmed');
});

test('personMatchesPeopleSearch is case-insensitive substring', () => {
  assert.strictEqual(personMatchesPeopleSearch('John Doe', 'john'), true);
  assert.strictEqual(personMatchesPeopleSearch('John Doe', 'xyz'), false);
  assert.strictEqual(personMatchesPeopleSearch('Any', ''), true);
});

test('appendPeopleListQuery adds encoded q param', () => {
  assert.strictEqual(
    appendPeopleListQuery('/admin/demo/people/list', 'משה כהן'),
    '/admin/demo/people/list?q=%D7%9E%D7%A9%D7%94%20%D7%9B%D7%94%D7%9F',
  );
});

test('buildWeeklyKaddishPeopleHref uses pre-encoded name query', () => {
  const encoded = encodeURIComponent('משה כהן');
  assert.strictEqual(
    buildWeeklyKaddishPeopleHref('novosibirsk', encoded),
    `/admin/novosibirsk/people?q=${encoded}`,
  );
});
