const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { normalizeCommunitySlugs, listActiveCommunitySlugs } = require('../lib/community-slugs');

describe('public community slugs', () => {
  it('returns only normalized slugs', () => {
    assert.deepEqual(
      normalizeCommunitySlugs([
        { slug: 'Tomsk' },
        { slug: 'novosibirsk' },
        { slug: '../secret' },
        { name: 'Hidden Name', slug: 'tomsk' },
        'bad slug',
      ]),
      ['novosibirsk', 'tomsk'],
    );
  });

  it('lists slugs from the synagogue model', async () => {
    const slugs = await listActiveCommunitySlugs({
      find: async () => [{ slug: 'a-b' }, { slug: 'Name Only' }],
    });
    assert.deepEqual(slugs, ['a-b']);
  });

  it('exposes GET /api/public/community-slugs', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
    assert.match(source, /app\.get\('\/api\/public\/community-slugs'/);
  });
});

describe('workflow files', () => {
  it('parses workflow YAML when a YAML library is installed', (t) => {
    let yaml = null;
    try {
      yaml = require('js-yaml');
    } catch {
      try {
        yaml = require('yaml');
      } catch {
        yaml = null;
      }
    }
    if (!yaml || typeof yaml.load !== 'function') {
      t.skip('no YAML library in dependencies');
      return;
    }
    const dir = path.join(__dirname, '..', '.github', 'workflows');
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.yml') && !name.endsWith('.yaml')) continue;
      const doc = yaml.load(fs.readFileSync(path.join(dir, name), 'utf8'));
      assert.ok(doc && typeof doc === 'object');
    }
  });
});
