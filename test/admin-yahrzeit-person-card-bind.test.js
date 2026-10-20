const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('admin yahrzeit upcoming name opens person card', () => {
  it('resolves Mongo-style string ids when opening the card', () => {
    const yahrzeitJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'admin-yahrzeit.js'), 'utf8');
    const personCardJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'admin-person-card.js'), 'utf8');

    let modalShown = false;

    const page = {
      className: 'yahrzeit-page',
      attributes: { 'data-synagogue-slug': 'test-shul' },
      getAttribute(name) {
        return this.attributes[name];
      },
    };

    const dataEl = {
      id: 'yahrzeit-people-data',
      textContent: '[{"id":"abc123def","name":"Test Person","text":""}]',
    };

    const button = {
      className: 'yahrzeit-upcoming-name-link',
      attributes: { 'data-person-id': 'abc123def' },
      _listeners: {},
      getAttribute(name) {
        return this.attributes[name];
      },
      addEventListener(type, handler) {
        if (!this._listeners[type]) {
          this._listeners[type] = [];
        }
        this._listeners[type].push(handler);
      },
      dispatchEvent(event) {
        const handlers = this._listeners[event.type] || [];
        handlers.forEach((fn) => fn(event));
      },
    };

    const stubEl = () => ({
      classList: { toggle() {}, add() {}, remove() {} },
      style: {},
      hidden: false,
      textContent: '',
      innerHTML: '',
      appendChild() {},
      addEventListener() {},
      setAttribute() {},
      getAttribute() { return ''; },
    });

    const document = {
      readyState: 'complete',
      getElementById(id) {
        if (id === 'yahrzeit-people-data') return dataEl;
        if (id === 'personCardModal') return stubEl();
        if (id === 'personCardPhoto') return stubEl();
        if (id === 'personCardPlaceholder') return stubEl();
        if (id === 'personCardName') return stubEl();
        if (id === 'personCardDates') return stubEl();
        if (id === 'personCardBio') return stubEl();
        if (id === 'personCardContactSection') return stubEl();
        if (id === 'personCardNoContact') return stubEl();
        if (id === 'personCardContactsList') return stubEl();
        if (id === 'personCardSendActions') return stubEl();
        return null;
      },
      querySelector(selector) {
        if (selector === '.yahrzeit-page') return page;
        if (selector === '#yahrzeit-people-data') return dataEl;
        if (selector === '#personCardModal') return stubEl();
        if (selector === '.people-page, .yahrzeit-page') return page;
        if (selector === '#personCardPhoto') return stubEl();
        if (selector === '#personCardPlaceholder') return stubEl();
        if (selector === '#personCardName') return stubEl();
        if (selector === '#personCardDates') return stubEl();
        if (selector === '#personCardBio') return stubEl();
        if (selector === '#personCardContactSection') return stubEl();
        if (selector === '#personCardNoContact') return stubEl();
        if (selector === '#personCardContactsList') return stubEl();
        if (selector === '#personCardSendActions') return stubEl();
        return null;
      },
      querySelectorAll(selector) {
        if (selector === '.yahrzeit-copy-btn' || selector === '.yahrzeit-send-btn') return [];
        if (selector === '.yahrzeit-card-clickable .yahrzeit-card-open') return [];
        if (selector === '.yahrzeit-upcoming-name-link') return [button];
        return [];
      },
      addEventListener() {},
    };

    const sandbox = {
      document,
      setTimeout(fn) {
        fn();
      },
      clearTimeout() {},
      location: { href: '' },
      jQuery() {
        return {
          length: 1,
          hasClass() {
            return false;
          },
          one() {},
          modal(mode) {
            if (mode === 'show') {
              modalShown = true;
            }
          },
        };
      },
    };
    sandbox.window = sandbox;

    vm.createContext(sandbox);
    vm.runInContext(personCardJs, sandbox);
    vm.runInContext(yahrzeitJs, sandbox);

    button.dispatchEvent({ type: 'click', preventDefault() {}, stopPropagation() {} });
    assert.equal(modalShown, true);
  });
});
