const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  buildDailyGateRows,
  dailyGateRowClassName,
  getEnabledDailyGateKeys,
} = require('../lib/daily-gates-layout');

const ALL_KEYS = ['chumash', 'tanya', 'tehillim', 'rambam1', 'rambam3'];

const fullFeatures = {
  dailyChumash: true,
  dailyTanya: true,
  dailyTehillim: true,
  dailyRambam: true,
};

const fullLearning = {
  chumash: { label: 'Chumash' },
  tanya: { label: 'Tanya' },
  tehillim: { label: 'Tehillim' },
  rambam: { label: 'Rambam 1' },
  rambam3: { label: 'Rambam 3' },
};

function rowKeys(rows) {
  return rows.map((r) => ({ keys: r.keys, single: Boolean(r.single) }));
}

describe('buildDailyGateRows', () => {
  it('pairs all five enabled tiles with last row single', () => {
    assert.deepEqual(rowKeys(buildDailyGateRows(ALL_KEYS)), [
      { keys: ['chumash', 'tanya'], single: false },
      { keys: ['tehillim', 'rambam1'], single: false },
      { keys: ['rambam3'], single: true },
    ]);
  });

  it('places rambam1 and rambam3 together when tehillim is off', () => {
    assert.deepEqual(rowKeys(buildDailyGateRows(['chumash', 'tanya', 'rambam1', 'rambam3'])), [
      { keys: ['chumash', 'tanya'], single: false },
      { keys: ['rambam1', 'rambam3'], single: false },
    ]);
  });

  it('handles chumash off', () => {
    assert.deepEqual(
      rowKeys(buildDailyGateRows(['tanya', 'tehillim', 'rambam1', 'rambam3'])),
      [
        { keys: ['tanya', 'tehillim'], single: false },
        { keys: ['rambam1', 'rambam3'], single: false },
      ],
    );
  });

  it('handles tanya off', () => {
    assert.deepEqual(
      rowKeys(buildDailyGateRows(['chumash', 'tehillim', 'rambam1', 'rambam3'])),
      [
        { keys: ['chumash', 'tehillim'], single: false },
        { keys: ['rambam1', 'rambam3'], single: false },
      ],
    );
  });

  it('handles rambam off (no rambam tiles)', () => {
    assert.deepEqual(rowKeys(buildDailyGateRows(['chumash', 'tanya', 'tehillim'])), [
      { keys: ['chumash', 'tanya'], single: false },
      { keys: ['tehillim'], single: true },
    ]);
  });

  it('handles only one tile', () => {
    assert.deepEqual(rowKeys(buildDailyGateRows(['chumash'])), [
      { keys: ['chumash'], single: true },
    ]);
  });

  it('handles none', () => {
    assert.deepEqual(buildDailyGateRows([]), []);
  });

  it('handles four tiles as two pairs', () => {
    assert.deepEqual(
      rowKeys(buildDailyGateRows(['chumash', 'tanya', 'tehillim', 'rambam1'])),
      [
        { keys: ['chumash', 'tanya'], single: false },
        { keys: ['tehillim', 'rambam1'], single: false },
      ],
    );
  });

  it('marks odd-count last row as single', () => {
    assert.deepEqual(rowKeys(buildDailyGateRows(['chumash', 'tanya', 'tehillim'])), [
      { keys: ['chumash', 'tanya'], single: false },
      { keys: ['tehillim'], single: true },
    ]);
  });
});

describe('dailyGateRowClassName', () => {
  it('uses single modifier for lone tiles', () => {
    assert.equal(dailyGateRowClassName(true), 'daily-gates-row daily-gates-row--single');
    assert.equal(dailyGateRowClassName(false), 'daily-gates-row');
  });
});

describe('getEnabledDailyGateKeys', () => {
  it('returns all keys when features and labels are present', () => {
    assert.deepEqual(getEnabledDailyGateKeys(fullFeatures, fullLearning), ALL_KEYS);
  });

  it('omits tehillim when feature is off', () => {
    const features = { ...fullFeatures, dailyTehillim: false };
    assert.deepEqual(getEnabledDailyGateKeys(features, fullLearning), [
      'chumash',
      'tanya',
      'rambam1',
      'rambam3',
    ]);
  });

  it('omits chumash when feature is off', () => {
    const features = { ...fullFeatures, dailyChumash: false };
    assert.deepEqual(getEnabledDailyGateKeys(features, fullLearning), [
      'tanya',
      'tehillim',
      'rambam1',
      'rambam3',
    ]);
  });

  it('omits tanya when feature is off', () => {
    const features = { ...fullFeatures, dailyTanya: false };
    assert.deepEqual(getEnabledDailyGateKeys(features, fullLearning), [
      'chumash',
      'tehillim',
      'rambam1',
      'rambam3',
    ]);
  });

  it('omits both rambam tiles when daily rambam is off', () => {
    const features = { ...fullFeatures, dailyRambam: false };
    assert.deepEqual(getEnabledDailyGateKeys(features, fullLearning), [
      'chumash',
      'tanya',
      'tehillim',
    ]);
  });

  it('omits tiles without labels', () => {
    const learning = { ...fullLearning, chumash: { label: '' } };
    assert.deepEqual(getEnabledDailyGateKeys(fullFeatures, learning), [
      'tanya',
      'tehillim',
      'rambam1',
      'rambam3',
    ]);
  });
});

describe('daily gates UI structure', () => {
  it('renders rows from buildDailyGateRows in JewishContentPanels', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'client', 'src', 'components', 'JewishContentPanels.jsx'),
      'utf8',
    );
    assert.match(source, /buildDailyGateRows\(getEnabledDailyGateKeys/);
    assert.match(source, /dailyGateRowClassName\(row\.single\)/);
    assert.match(source, /row\.keys\.map\(\(key\) => renderDailyGateTile/);
  });

  it('wraps rambam label and sublabel in a heading row (V2)', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'client', 'src', 'components', 'JewishContentPanels.jsx'),
      'utf8',
    );
    assert.match(source, /className="daily-gate-heading"/);
    assert.match(
      source,
      /daily-gate-heading[\s\S]*daily-gate-label[\s\S]*daily-gate-sublabel/,
    );

    const scss = fs.readFileSync(path.join(__dirname, '..', 'styles', 'home.scss'), 'utf8');
    assert.doesNotMatch(scss, /\.daily-gate-sublabel\s*\{[^}]*display:\s*block/);
    assert.match(scss, /\.daily-gate-heading/);
  });
});

describe('daily gates heading alignment (RTL)', () => {
  it('heading row is a block-level flex row so it aligns to the start side in Hebrew', () => {
    const scss = fs.readFileSync(path.join(__dirname, '..', 'styles', 'home.scss'), 'utf8');
    const block = scss.match(/\.daily-gate-heading\s*\{([^}]*)\}/);
    assert.ok(block, 'daily-gate-heading rule exists');
    assert.match(block[1], /display:\s*flex;/);
    assert.doesNotMatch(block[1], /inline-flex/);
    const theme = fs.readFileSync(path.join(__dirname, '..', 'client', 'src', 'components', 'ThemeStyles.jsx'), 'utf8');
    assert.doesNotMatch(theme, /daily-gate-heading\s*\{\s*display:\s*inline-flex/);
  });
});
