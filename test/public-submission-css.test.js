const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const SCSS_PATH = path.join(__dirname, '..', 'styles', 'public-submission.scss');
const ADD_NAME_VIEW = path.join(__dirname, '..', 'views', 'public', 'add-name.handlebars');

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

  it('consent checkbox stays small; consent label is in-flow flex (not absolute)', () => {
    const scss = fs.readFileSync(SCSS_PATH, 'utf8');
    const checkboxBlock = scss.match(/\.public-choice-checkbox\s*\{[\s\S]*?\n\}/);
    assert.ok(checkboxBlock, '.public-choice-checkbox rule missing');
    assert.match(checkboxBlock[0], /width:\s*1\.15rem/);
    assert.match(checkboxBlock[0], /height:\s*1\.15rem/);
    assert.match(scss, /input:not\(\[type='checkbox'\]\)/);

    const consentLabelBlock = scss.match(/\.public-consent-label\s*\{[\s\S]*?\n\}/);
    assert.ok(consentLabelBlock, '.public-consent-label rule missing');
    assert.match(consentLabelBlock[0], /display:\s*flex/);
    assert.doesNotMatch(consentLabelBlock[0], /position:\s*absolute/);

    const html = fs.readFileSync(ADD_NAME_VIEW, 'utf8');
    assert.match(html, /class="public-consent-label"/);
    assert.match(html, /class="public-choice-checkbox"/);
    assert.match(html, /class="public-consent-text"/);
  });

  it('public cards and sections use board tile color variables', () => {
    const scss = fs.readFileSync(SCSS_PATH, 'utf8');
    const cardBlock = scss.match(/\.public-card\s*\{[\s\S]*?\n\}/);
    assert.ok(cardBlock, '.public-card rule missing');
    assert.match(cardBlock[0], /memorial-tile-glass/);

    const deceasedBlock = scss.match(/\.public-deceased-block\s*\{[\s\S]*?\n\}/);
    assert.ok(deceasedBlock, '.public-deceased-block rule missing');
    assert.match(deceasedBlock[0], /tile-glass-control/);
    assert.match(deceasedBlock[0], /--tile-glass-border/);

    const mobileBlock = scss.match(/@media \(max-width: 560px\)\s*\{([\s\S]*?)\n\}/);
    assert.ok(mobileBlock, 'mobile breakpoint block missing');
    assert.doesNotMatch(mobileBlock[1], /\.public-phone-row/);
  });
});
