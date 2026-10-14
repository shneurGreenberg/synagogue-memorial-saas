const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const SKIP_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  'public',
  'dist',
  'coverage',
]);

const SCAN_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.handlebars',
  '.hbs',
  '.html',
  '.scss',
  '.css',
  '.md',
  '.java',
  '.xml',
  '.properties',
  '.gradle',
]);

const MOJIBAKE_PATTERNS = [
  { name: 'cp1251-cyrillic-word', regex: /(?:Р[а-яА-ЯёЁ]){3,}/ },
  { name: 'utf8-hebrew-as-cp1251', regex: /Ч™Ч[ґ©«¬®°±²³´µ¶·¸¹º»јЅѕ]/ },
  { name: 'windows-1252-punctuation', regex: /\u0432\u0402/ },
  { name: 'latin1-mojibake', regex: /[\u00d0\u00c3][\u0080-\u00ff]/ },
];

function shouldScanFile(filePath) {
  const relative = path.relative(ROOT, filePath);
  if (relative === path.join('test', 'no-mojibake.test.js')) {
    return false;
  }
  if (relative.startsWith(`public${path.sep}board${path.sep}`)) {
    return false;
  }

  const ext = path.extname(filePath).toLowerCase();
  return SCAN_EXTENSIONS.has(ext);
}

function walkSourceFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIR_NAMES.has(entry.name)) {
        walkSourceFiles(fullPath, files);
      }
      return;
    }

    if (shouldScanFile(fullPath)) {
      files.push(fullPath);
    }
  });
  return files;
}

function findMojibakeInFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const hits = [];

  MOJIBAKE_PATTERNS.forEach(({ name, regex }) => {
    const match = text.match(regex);
    if (match) {
      hits.push({ pattern: name, sample: match[0] });
    }
  });

  return hits;
}

describe('source files are UTF-8 without mojibake', () => {
  it('scans lib, routes, client, views, data, and android sources', () => {
    const files = walkSourceFiles(ROOT);
    const offenders = [];

    files.forEach((filePath) => {
      const hits = findMojibakeInFile(filePath);
      if (hits.length) {
        offenders.push({ file: path.relative(ROOT, filePath), hits });
      }
    });

    assert.equal(
      offenders.length,
      0,
      offenders.map((entry) => `${entry.file}: ${entry.hits.map((h) => `${h.pattern} (${h.sample})`).join(', ')}`).join('\n'),
    );
  });
});
