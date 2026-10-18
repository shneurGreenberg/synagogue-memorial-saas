const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  DAILY_GATE_RAMBAM3_SPAN_CLASS,
  chumashTanyaRowClassName,
  shouldShowRambam3Row,
  shouldShowTehillimRambamRow,
} = require('../lib/daily-gates-layout');

describe('daily gates layout', () => {
  it('uses half-width row for chumash and tanya pair', () => {
    assert.equal(chumashTanyaRowClassName(true, true), 'daily-gates-row');
    assert.equal(chumashTanyaRowClassName(true, false), 'daily-gates-row daily-gates-row--single');
  });

  it('combines tehillim with rambam one-chapter slot', () => {
    const features = {
      dailyTehillim: true,
      dailyRambam: true,
    };
    const learning = { rambam: { label: 'Rambam 1' }, rambam3: { label: 'Rambam 3' } };
    assert.equal(shouldShowTehillimRambamRow(features, learning), true);
    assert.equal(shouldShowRambam3Row(features, learning), true);
  });

  it('marks rambam three-chapter tile as full-width span', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'client', 'src', 'components', 'JewishContentPanels.jsx'),
      'utf8',
    );
    assert.match(source, /className=\{DAILY_GATE_RAMBAM3_SPAN_CLASS\}/);
    assert.equal(DAILY_GATE_RAMBAM3_SPAN_CLASS, 'daily-gate-tile--span-2');
    assert.doesNotMatch(source, /daily-gates-row--single[\s\S]*daily_tehillim/);
    assert.match(source, /daily-gates-row">\s*\{tehillimTile\}/);

    const scss = fs.readFileSync(path.join(__dirname, '..', 'styles', 'home.scss'), 'utf8');
    assert.match(scss, /\.daily-gate-tile--span-2/);
  });
});
