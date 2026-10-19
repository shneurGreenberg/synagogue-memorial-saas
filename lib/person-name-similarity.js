const { normalizePersonName } = require('./grave-scan');

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function similarNameRegexPattern(deceasedName) {
  const normalized = normalizePersonName(deceasedName);
  if (!normalized) {
    return null;
  }
  const tokens = normalized.split(/\s+/).filter((token) => token.length > 1);
  if (!tokens.length) {
    return null;
  }
  return tokens.map((token) => `(?=.*${escapeRegex(token)})`).join('');
}

function findSimilarPeopleInList(people, deceasedName, limit = 5) {
  const pattern = similarNameRegexPattern(deceasedName);
  if (!pattern) {
    return [];
  }
  const regex = new RegExp(pattern, 'i');
  return (people || [])
    .filter((person) => person && regex.test(normalizePersonName(person.name)))
    .slice(0, limit)
    .map((person) => ({
      id: person.id,
      name: person.name,
    }));
}

async function findSimilarPeopleForSubmission(Synagogue, slug, deceasedName, limit = 5) {
  const pattern = similarNameRegexPattern(deceasedName);
  if (!pattern) {
    return [];
  }
  const rows = await Synagogue.aggregate([
    { $match: { slug } },
    { $unwind: '$people' },
    { $match: { 'people.name': { $regex: pattern, $options: 'i' } } },
    { $limit: limit },
    { $project: { _id: 0, id: '$people.id', name: '$people.name' } },
  ]);
  return rows;
}

module.exports = {
  similarNameRegexPattern,
  findSimilarPeopleInList,
  findSimilarPeopleForSubmission,
};
