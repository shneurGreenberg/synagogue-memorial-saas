const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const g = require('../lib/deceased-gender');
const tpl = require('../lib/yahrzeit-message-template');

test('gender inference from names', () => {
  assert.strictEqual(g.inferGenderFromName('Кац Арнольд сын Михаила'), 'male');
  assert.strictEqual(g.inferGenderFromName('Брегман Софья дочь Рувима'), 'female');
  assert.strictEqual(g.inferGenderFromName('Кац Вера Исаковна'), 'female');
  assert.strictEqual(g.inferGenderFromName('Фердман Хонон Аронович'), 'male');
  assert.strictEqual(g.inferGenderFromName('שרה בת אברהם'), 'female');
  assert.strictEqual(g.inferGenderFromName('משה בן יעקב'), 'male');
  assert.strictEqual(g.inferGenderFromName('רבקה כהן'), 'female');
  assert.strictEqual(g.inferGenderFromName('Годес'), 'unknown');
});

test('gender migration is idempotent and never overrides', () => {
  const people = [{ name: 'Кац Вера Исаковна' }, { name: 'X', gender: 'male' }, { name: 'Годес' }];
  const plan = g.planGenderMigration(people);
  assert.deepStrictEqual(plan.map((u) => u.gender), ['female', 'unknown']);
  plan.forEach((u) => { people[u.index].gender = u.gender; });
  assert.strictEqual(g.planGenderMigration(people).length, 0);
  assert.deepStrictEqual(g.countGenders(people), { male: 1, female: 1, missing: 1 });
});

test('yahrzeit message uses the gender field', () => {
  assert.strictEqual(tpl.inferDeceasedGender({ name: 'Годес', gender: 'female' }), 'female');
  assert.strictEqual(tpl.inferDeceasedGender({ name: 'Годес', gender: 'unknown' }), '');
});

test('admin scripts are cache-busted', () => {
  const views = path.join(__dirname, '..', 'views');
  const dash = fs.readFileSync(path.join(views, 'admin', 'dashboard.handlebars'), 'utf8');
  assert.match(dash, /admin-preview-editor\.js\?v=/);
  assert.doesNotMatch(dash, /<script src="\/js\/[^"?]+\.js"/);
});
