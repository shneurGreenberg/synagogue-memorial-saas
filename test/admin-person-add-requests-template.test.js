const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const exphbs = require('express-handlebars');

const ROOT = path.join(__dirname, '..');
const VIEWS_DIR = path.join(ROOT, 'views');

const PROD_REQUEST_ID = '63ae778c1660311e452ad5b8';
const SLUG = 'kaliningrad';

function compilePersonAddRequestsPartial() {
  const hbs = exphbs.create({
    extname: '.handlebars',
    partialsDir: path.join(VIEWS_DIR, 'partials'),
  });
  hbs.handlebars.registerHelper('t', (key) => key);
  const source = fs.readFileSync(
    path.join(VIEWS_DIR, 'partials', 'admin-person-add-requests.handlebars'),
    'utf8',
  );
  return hbs.handlebars.compile(source);
}

function eachDepthBefore(content, index) {
  const tokenRe = /\{\{#each\b|\{\{\/each\}\}/g;
  let depth = 0;
  let match;
  while ((match = tokenRe.exec(content)) !== null) {
    if (match.index >= index) {
      break;
    }
    if (match[0].startsWith('{{#each')) {
      depth += 1;
    } else {
      depth -= 1;
    }
  }
  return depth;
}

function findBareSynagogueSlugInsideEach(filePath, content) {
  const bareSlugRe = /\{\{synagogue\.slug\}\}/g;
  const violations = [];
  let match;
  while ((match = bareSlugRe.exec(content)) !== null) {
    if (eachDepthBefore(content, match.index) > 0) {
      violations.push({ filePath, index: match.index });
    }
  }
  return violations;
}

function walkHandlebarsFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkHandlebarsFiles(full, acc);
    } else if (entry.name.endsWith('.handlebars')) {
      acc.push(full);
    }
  }
  return acc;
}

describe('admin person-add-requests partial (1.22.4)', () => {
  it('renders approve/dismiss form actions with synagogue slug inside #each', () => {
    const compile = compilePersonAddRequestsPartial();
    const html = compile({
      synagogue: { slug: SLUG },
      pendingPersonAddRequests: [
        {
          id: PROD_REQUEST_ID,
          status: 'pending',
          deceasedName: 'גג דד',
          deceasedFatherName: 'הה',
          deceasedGender: 'male',
          diedAfterSunset: false,
          gregorianDateOfDeath: { month: 10, date: 19, year: 2026 },
          submitter: { name: 'Sub', phone: '+123', email: 'a@b.c', platform: 'max' },
          similarPeople: [],
        },
      ],
    });

    assert.match(
      html,
      new RegExp(`/admin/${SLUG}/person-add-requests/${PROD_REQUEST_ID}/approve`),
    );
    assert.match(
      html,
      new RegExp(`/admin/${SLUG}/person-add-requests/${PROD_REQUEST_ID}/dismiss`),
    );
    assert.doesNotMatch(html, /\/admin\/\/person-add-requests/);
  });

  it('views must not use bare {{synagogue.slug}} inside #each blocks', () => {
    const files = walkHandlebarsFiles(VIEWS_DIR);
    const allViolations = [];
    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf8');
      allViolations.push(...findBareSynagogueSlugInsideEach(filePath, content));
    }
    assert.deepEqual(
      allViolations,
      [],
      allViolations.map((v) => `${path.relative(ROOT, v.filePath)}@${v.index}`).join(', '),
    );
  });
});
