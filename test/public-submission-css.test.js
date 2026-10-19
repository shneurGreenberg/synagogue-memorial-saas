const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const SCSS_PATH = path.join(__dirname, '..', 'styles', 'public-submission.scss');

const LARGE_NEGATIVE_OFFSET = /(?:^|[^-\w])(?:left|right)\s*:\s*(-\d+(?:\.\d+)?)(px|rem|em)?/gi;

function parseOffsetMagnitude(value, unit) {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n) || n >= 0) return 0;
  const u = (unit || 'px').toLowerCase();
  if (u === 'rem' || u === 'em') return Math.abs(n) * 16;
  return Math.abs(n);
}

describe('public-submission CSS (RTL-safe layout)', () => {
  it('has no large negative left/right offsets (>= 1000px)', () => {
    const scss = fs.readFileSync(SCSS_PATH, 'utf8');
    const hits = [];
    for (const match of scss.matchAll(LARGE_NEGATIVE_OFFSET)) {
      const px = parseOffsetMagnitude(match[1], match[2]);
      if (px >= 1000) {
        hits.push(match[0].trim());
      }
    }
    assert.deepEqual(hits, [], `unexpected RTL-breaking offsets: ${hits.join(', ')}`);
  });

  it('hides honeypot via clip without horizontal offset', () => {
    const scss = fs.readFileSync(SCSS_PATH, 'utf8');
    const block = scss.match(/\.public-honeypot\s*\{[^}]+\}/);
    assert.ok(block, '.public-honeypot rule missing');
    const rule = block[0];
    assert.doesNotMatch(rule, /\bleft\s*:/);
    assert.doesNotMatch(rule, /\bright\s*:/);
    assert.match(rule, /clip-path:\s*inset\(50%\)/);
  });
});
