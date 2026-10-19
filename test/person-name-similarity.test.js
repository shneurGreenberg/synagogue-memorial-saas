const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { findSimilarPeopleInList } = require('../lib/person-name-similarity');

describe('person name similarity (S8)', () => {
  it('matches within one community list only (tenant-isolated helper)', () => {
    const communityA = [
      { id: 1, name: 'Брусиловский Виктор сын Александра' },
      { id: 2, name: 'Other Person' },
    ];
    const communityB = [
      { id: 9, name: 'Брусиловский Виктор сын Александра' },
    ];

    const matchesA = findSimilarPeopleInList(communityA, 'виктор брусиловский');
    assert.equal(matchesA.length, 1);
    assert.equal(matchesA[0].id, 1);

    const matchesB = findSimilarPeopleInList(communityB, 'виктор брусиловский');
    assert.equal(matchesB.length, 1);
    assert.equal(matchesB[0].id, 9);
    assert.notEqual(matchesA[0].id, matchesB[0].id);
  });
});
