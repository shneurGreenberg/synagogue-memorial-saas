const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  shouldUseKadishBoardLayout,
  shouldPrioritizeYahrzeitForKadish,
  prioritizeYahrzeitForKadish,
  computeKadishPagination,
} = require('../lib/board-yahrzeit-layout');

function person(id, passedToday = false) {
  return { id, passedToday };
}

describe('board yahrzeit layout', () => {
  it('uses kadish layout for one yahrzeit among many or a lone person', () => {
    assert.equal(shouldUseKadishBoardLayout(3, 1), true);
    assert.equal(shouldUseKadishBoardLayout(1, 1), true);
    assert.equal(shouldUseKadishBoardLayout(1, 0), true);
  });

  it('uses the normal grid when two or more have yahrzeit today', () => {
    assert.equal(shouldUseKadishBoardLayout(3, 2), false);
    assert.equal(shouldUseKadishBoardLayout(10, 4), false);
  });

  it('paginates kadish vs normal grids', () => {
    assert.deepEqual(computeKadishPagination(20, true), { itemsPerPage: 12, totalPages: 2 });
    assert.deepEqual(computeKadishPagination(20, false), { itemsPerPage: 16, totalPages: 2 });
  });

  it('prioritizes yahrzeit only when exactly one person has yahrzeit today', () => {
    assert.equal(shouldPrioritizeYahrzeitForKadish(1, 3), true);
    assert.equal(shouldPrioritizeYahrzeitForKadish(2, 3), false);

    const oneYahrzeit = [person(2, false), person(1, true), person(3, false)];
    assert.deepEqual(
      prioritizeYahrzeitForKadish(oneYahrzeit).map((p) => p.id),
      [1, 2, 3],
    );

    const twoYahrzeit = [person(2, true), person(1, true), person(3, false)];
    assert.deepEqual(
      prioritizeYahrzeitForKadish(twoYahrzeit).map((p) => p.id),
      [2, 1, 3],
    );
  });
});
