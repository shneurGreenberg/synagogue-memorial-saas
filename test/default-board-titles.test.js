const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_BOARD_TITLES,
  resolveBoardTitles,
  primaryBoardTitle,
} = require('../lib/default-board-titles');

test('default board titles match Novosibirsk snapshot', () => {
  assert.equal(DEFAULT_BOARD_TITLES.ru, 'Проект памяти наших родных "Кадиш"');
  assert.equal(DEFAULT_BOARD_TITLES.en, '"Kaddish": A Project in Memory of Our Loved Ones');
  assert.equal(DEFAULT_BOARD_TITLES.he, 'פרויקט הזיכרון קדיש');
});

test('resolveBoardTitles fills empty fields with defaults', () => {
  const titles = resolveBoardTitles({ en: '', he: '', ru: '' });
  assert.deepEqual(titles, DEFAULT_BOARD_TITLES);
});

test('resolveBoardTitles keeps provided values', () => {
  const titles = resolveBoardTitles({ en: 'Custom EN', he: '', ru: '' });
  assert.equal(titles.en, 'Custom EN');
  assert.equal(titles.ru, DEFAULT_BOARD_TITLES.ru);
});

test('primaryBoardTitle prefers Russian default', () => {
  assert.equal(primaryBoardTitle({}), DEFAULT_BOARD_TITLES.ru);
});
