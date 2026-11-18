const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeCommunitySlugs(rows) {
  const slugs = [];
  const seen = new Set();
  for (const row of Array.isArray(rows) ? rows : []) {
    const raw = typeof row === 'string' ? row : row && row.slug;
    const slug = String(raw || '').trim().toLowerCase();
    if (!SLUG_RE.test(slug) || seen.has(slug)) continue;
    seen.add(slug);
    slugs.push(slug);
  }
  slugs.sort();
  return slugs;
}

async function listActiveCommunitySlugs(Synagogue) {
  let query = Synagogue.find({}, 'slug');
  if (query && typeof query.lean === 'function') query = query.lean();
  const rows = await query;
  return normalizeCommunitySlugs(rows);
}

module.exports = { normalizeCommunitySlugs, listActiveCommunitySlugs, SLUG_RE };
