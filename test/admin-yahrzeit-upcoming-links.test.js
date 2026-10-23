const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('admin upcoming yahrzeit name links (Y12)', () => {
  it('includes admin-person-card.js so today yahrzeit cards can open the modal', () => {
    const adminRoutes = fs.readFileSync(path.join(__dirname, '..', 'routes', 'admin.js'), 'utf8');
    assert.match(adminRoutes, /'admin\/yahrzeit': \['admin-person-card\.js'/);
  });

  it('normalizes person ids when building yahrzeitPeople JSON', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'routes', 'admin.js'), 'utf8');
    const block = source.slice(source.indexOf('const personIdKey'));
    assert.match(block, /personIdKey\(row\.id\)/);
    assert.match(block, /entryIds\.has\(personIdKey\(person\.id\)\)/);
  });

  it('links upcoming names to the people list with prefilled search', () => {
    const template = fs.readFileSync(path.join(__dirname, '..', 'views', 'admin', 'yahrzeit.handlebars'), 'utf8');
    assert.match(template, /yahrzeit-upcoming-name-link/);
    assert.match(template, /\/people\?q=\{\{this\.searchQuery\}\}/);
  });

  it('does not load admin-yahrzeit.js inline in the template (layout scripts only)', () => {
    const template = fs.readFileSync(path.join(__dirname, '..', 'views', 'admin', 'yahrzeit.handlebars'), 'utf8');
    assert.doesNotMatch(template, /<script src="\/js\/admin-yahrzeit\.js"><\/script>/);
  });

  it('looks up people by string id keys in admin-yahrzeit.js', () => {
    const js = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'admin-yahrzeit.js'), 'utf8');
    assert.match(js, /personIdKey/);
    assert.doesNotMatch(js, /Number\(button\.getAttribute\('data-person-id'\)\)/);
  });
});
