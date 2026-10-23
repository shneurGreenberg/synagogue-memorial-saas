const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('admin yahrzeit upcoming name opens people search', () => {
  it('does not bind upcoming week/month names to the person card modal', () => {
    const yahrzeitJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'admin-yahrzeit.js'), 'utf8');
    assert.doesNotMatch(yahrzeitJs, /yahrzeit-upcoming-name-link/);
  });

  it('still opens person card for today yahrzeit tiles', () => {
    const yahrzeitJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'admin-yahrzeit.js'), 'utf8');
    assert.match(yahrzeitJs, /yahrzeit-card-clickable/);
    assert.match(yahrzeitJs, /openPersonById/);
  });
});
