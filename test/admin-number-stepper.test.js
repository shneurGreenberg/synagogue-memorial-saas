const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadStepperApi() {
  const script = fs.readFileSync(
    path.join(__dirname, '..', 'public', 'js', 'admin-number-stepper.js'),
    'utf8',
  );
  const context = {
    window: {},
    document: {
      readyState: 'complete',
      querySelectorAll: () => [],
      addEventListener: () => {},
    },
  };
  vm.createContext(context);
  vm.runInContext(script, context);
  return context.window.AdminNumberStepper;
}

describe('admin number stepper', () => {
  it('clamps values to min, max, and step', () => {
    const api = loadStepperApi();
    const input = {
      getAttribute(name) {
        if (name === 'min') return '50';
        if (name === 'max') return '200';
        if (name === 'step') return '5';
        return null;
      },
    };

    assert.equal(api.clampValue(input, 42), 50);
    assert.equal(api.clampValue(input, 212), 200);
    assert.equal(api.clampValue(input, 103), 105);
    assert.equal(api.clampValue(input, 100), 100);
  });
});
