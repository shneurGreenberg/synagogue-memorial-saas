/** Bump version in board-version.json on each deploy (TV badge + cache bust). */
const { version } = require('../board-version.json');

module.exports = { BOARD_VERSION: version };
